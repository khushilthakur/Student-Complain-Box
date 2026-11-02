import os
import sys
import re
import time
import random
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from functools import wraps

# Ensure both server dir and workspace root are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
for path in [ROOT_DIR, CURRENT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
import jwt
import bcrypt

try:
    from server.db_manager import db
except ModuleNotFoundError:
    from db_manager import db

try:
    from server.services.sms_service import (
        dispatch_otp_sms, generate_secure_otp, is_sms_configured, get_configured_provider_name
    )
except ModuleNotFoundError:
    from services.sms_service import (
        dispatch_otp_sms, generate_secure_otp, is_sms_configured, get_configured_provider_name
    )

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIST = os.path.abspath(os.path.join(BASE_DIR, '..', 'client', 'dist'))
IS_VERCEL = bool(os.environ.get('VERCEL'))
if IS_VERCEL:
    UPLOADS_DIR = '/tmp/uploads'
else:
    UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except Exception:
    pass

JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-production-key-change-in-prod-7890')
PORT = int(os.environ.get('PORT', 5000))

# SLA configuration
SLA_HOURS = {
    'Urgent': 24,
    'High': 48,
    'Medium': 72,
    'Low': 168
}

app = Flask(__name__, static_folder=CLIENT_DIST if os.path.exists(CLIENT_DIST) else None)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "x-user-id", "X-User-Id"])
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit

# In-memory OTP storage: mobile -> { code, expiresAt, attempts, userId, role, lastSentAt }
otp_store = {}

def get_active_otp(clean_mobile):
    """
    Retrieves active OTP from in-memory cache or syncs from persistent Supabase notifications table.
    Enables seamless OTP verification across stateless, multi-container Vercel serverless functions.
    """
    stored = otp_store.get(clean_mobile)
    if not stored:
        try:
            from server.supabase_client import is_supabase_configured, get_supabase_client
            if is_supabase_configured():
                client_sb = get_supabase_client()
                if client_sb:
                    res = client_sb.table('notifications').select('*').eq('user_id', clean_mobile).eq('type', 'otp_auth').order('created_at', desc=True).limit(1).execute()
                    if res.data:
                        row = res.data[0]
                        created_at_str = row.get('created_at', '')
                        dt = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        created_ts = dt.timestamp()
                        stored = {
                            'code': str(row.get('message')),
                            'expiresAt': created_ts + 300,
                            'lastSentAt': created_ts,
                            'attempts': 0,
                            'role': row.get('role', 'student')
                        }
                        otp_store[clean_mobile] = stored
        except Exception:
            pass
    return stored

def clear_active_otp(clean_mobile):
    """Removes active OTP code from both in-memory store and Supabase."""
    otp_store.pop(clean_mobile, None)
    try:
        from server.supabase_client import is_supabase_configured, get_supabase_client
        if is_supabase_configured():
            client_sb = get_supabase_client()
            if client_sb:
                client_sb.table('notifications').delete().eq('user_id', clean_mobile).eq('type', 'otp_auth').execute()
    except Exception:
        pass


# --- HELPER FUNCTIONS ---

def validate_indian_mobile(raw_mobile):
    """
    Validates 10-digit Indian Mobile Numbers.
    Accepts valid Indian mobile numbers:
    - Exactly 10 digits.
    - Support optional +91 country code (or 0 prefix, or +91-..., etc.).
    - Remove spaces and formatting before validation.
    - Indian mobile numbers must start with 6, 7, 8, or 9.
    - Reject numbers shorter or longer than 10 digits.
    - Reject alphabets, special characters and invalid formats.
    - Reject repeating dummy numbers (e.g. 9999999999, 1111111111).
    - Display error: "Please enter a valid 10-digit Indian mobile number."
    """
    if raw_mobile is None or raw_mobile == '':
        return False, 'Please enter a valid 10-digit Indian mobile number.', None
    if not isinstance(raw_mobile, (str, int)):
        return False, 'Please enter a valid 10-digit Indian mobile number.', None

    s = str(raw_mobile).strip()

    # Reject if any alphabets or unsupported characters are present
    # Allowed non-digit characters in raw input before formatting removal are: '+', '-', ' ', '(', ')'
    if re.search(r'[^0-9+\-\s\(\)]', s):
        return False, 'Please enter a valid 10-digit Indian mobile number.', None

    # Remove standard formatting: spaces, dashes, parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', s)

    # Handle country codes / prefixes
    if cleaned.startswith('+91'):
        digits = cleaned[3:]
    elif cleaned.startswith('91') and len(cleaned) == 12:
        digits = cleaned[2:]
    elif cleaned.startswith('0') and len(cleaned) == 11:
        digits = cleaned[1:]
    elif cleaned.startswith('+'):
        return False, 'Please enter a valid 10-digit Indian mobile number.', None
    else:
        digits = cleaned

    # Must be only digits, exactly 10 in length
    if not digits.isdigit() or len(digits) != 10:
        return False, 'Please enter a valid 10-digit Indian mobile number.', None

    # Indian mobile numbers must start with 6, 7, 8, or 9
    if digits[0] not in '6789':
        return False, 'Please enter a valid 10-digit Indian mobile number.', None

    # Reject repeating fake dummy numbers (e.g. 9999999999, 1111111111, 8888888888)
    if len(set(digits)) == 1:
        return False, 'Please enter a valid 10-digit Indian mobile number.', None

    return True, None, digits



def generate_jwt_token(user):
    """Generate JWT Token with user details and 7-day expiration."""
    payload = {
        'userId': user.get('id'),
        'role': user.get('role'),
        'collegeId': user.get('collegeId'),
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def mask_complaint_privacy(complaint, viewer_user=None):
    """Mask student details based on viewer privileges."""
    if not complaint:
        return None
    clone = dict(complaint)

    is_admin = viewer_user and viewer_user.get('role') == 'admin'
    is_author = viewer_user and viewer_user.get('id') == complaint.get('studentUserId')

    if is_admin:
        student = db.find_by_id('users', complaint.get('studentUserId'))
        if student:
            clone['studentRealDetails'] = {
                'name': student.get('name'),
                'mobile': student.get('mobile'),
                'email': student.get('email'),
                'studentId': student.get('studentId'),
                'collegeId': student.get('collegeId'),
                'status': student.get('status'),
                'complaintLimit': student.get('complaintLimit'),
                'complaintsSubmitted': student.get('complaintsSubmitted')
            }
    elif is_author:
        student = db.find_by_id('users', complaint.get('studentUserId'))
        clone['studentRealDetails'] = {
            'name': student.get('name') if student else None,
            'studentId': student.get('studentId') if student else None,
            'collegeId': student.get('collegeId') if student else None
        }
        clone.pop('studentMobile', None)
        clone.pop('studentEmail', None)
    else:
        # Strictly hide complainant identity from teachers, other students, and public
        clone.pop('studentUserId', None)
        clone.pop('studentRealDetails', None)
        clone.pop('studentName', None)
        clone.pop('studentMobile', None)
        clone.pop('studentEmail', None)

    if complaint.get('isAnonymous'):
        clone['displayName'] = 'Anonymous Student'
    else:
        clone['displayName'] = complaint.get('studentAnonymousId') or 'Student'

    return clone


def compute_college_stats():
    """Calculate detailed statistics and performance metrics for all colleges."""
    colleges = db.get('colleges')
    complaints = db.get('complaints')
    users = db.get('users')

    results = []
    for col in colleges:
        cid = str(col.get('id'))
        col_complaints = [c for c in complaints if str(c.get('collegeId')) == cid]
        total = len(col_complaints)
        pending = sum(1 for c in col_complaints if c.get('status') == 'Pending')
        approved = sum(1 for c in col_complaints if c.get('status') == 'Approved')
        assigned = sum(1 for c in col_complaints if c.get('status') == 'Assigned')
        in_progress = sum(1 for c in col_complaints if c.get('status') in ['In Progress', 'Not Done'])
        resolved = sum(1 for c in col_complaints if c.get('status') == 'Resolved')
        completed = sum(1 for c in col_complaints if c.get('status') == 'Completed')
        rejected = sum(1 for c in col_complaints if c.get('status') == 'Rejected')
        escalated = sum(1 for c in col_complaints if c.get('isEscalated') or c.get('status') == 'Escalated')

        eligible = total - rejected
        resolved_count = resolved + completed
        resolution_rate = round((resolved_count / eligible) * 100) if eligible > 0 else 0

        # Average resolution time in hours
        resolved_list = [
            c for c in col_complaints 
            if (c.get('resolvedAt') or c.get('completedAt')) and c.get('assignedAt')
        ]
        avg_hours = 0
        if resolved_list:
            total_hours = 0
            for c in resolved_list:
                try:
                    start_str = c.get('assignedAt').replace('Z', '+00:00')
                    end_str = (c.get('resolvedAt') or c.get('completedAt')).replace('Z', '+00:00')
                    start = datetime.fromisoformat(start_str)
                    end = datetime.fromisoformat(end_str)
                    diff = max(0, (end - start).total_seconds() / 3600)
                    total_hours += diff
                except Exception:
                    pass
            avg_hours = round((total_hours / len(resolved_list)), 1)

        teacher_count = sum(1 for u in users if str(u.get('collegeId')) == cid and u.get('role') == 'teacher')
        student_count = sum(1 for u in users if str(u.get('collegeId')) == cid and u.get('role') == 'student')

        col_stat = dict(col)
        col_stat.update({
            'totalComplaints': total,
            'pendingComplaints': pending,
            'inProgressComplaints': in_progress + assigned,
            'resolvedComplaints': resolved,
            'completedComplaints': completed,
            'rejectedComplaints': rejected,
            'escalatedComplaints': escalated,
            'resolutionRate': resolution_rate,
            'avgResolutionHours': avg_hours,
            'teacherCount': teacher_count,
            'studentCount': student_count
        })
        results.append(col_stat)

    return results


# --- AUTH MIDDLEWARE / DECORATORS ---

@app.before_request
def extract_user():
    """Extract authenticated user before each request."""
    g.user = None
    auth_header = request.headers.get('Authorization')
    user_id = None

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = decoded.get('userId') or decoded.get('id')
        except Exception:
            return jsonify({'error': 'Session expired or invalid token. Please log in again.'}), 401
    elif request.headers.get('x-user-id'):
        user_id = request.headers.get('x-user-id')

    if user_id:
        user = db.find_by_id('users', user_id)
        if user:
            if user.get('status') == 'blocked':
                return jsonify({'error': 'Your account has been blocked due to system policy violations.'}), 403
            g.user = user


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.user:
            return jsonify({'error': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated


def compute_teacher_approval_status(teacher):
    if not teacher or not isinstance(teacher, dict):
        return 'Not Approved'
    raw_status = teacher.get('approvalStatus')
    if raw_status in ['Approved', 'Waiting for Approval', 'Not Approved']:
        return raw_status
    if teacher.get('isVerified') is True:
        return 'Approved'
    status_lower = str(teacher.get('status', '')).lower()
    if status_lower in ['rejected', 'unapproved', 'blocked', 'not approved', 'inactive']:
        return 'Not Approved'
    return 'Waiting for Approval'


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not g.user:
                return jsonify({'error': 'Authentication required. Please log in.'}), 401
            if g.user.get('role') not in roles:
                return jsonify({'error': f"Access restricted to {' or '.join(roles)}."}), 403
            if g.user.get('role') == 'teacher' and compute_teacher_approval_status(g.user) != 'Approved':
                return jsonify({'error': 'Your account is waiting for Admin approval. You can log in after your account is approved.'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# --- FILE UPLOADS ---

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clean_expired_otps():
    now = time.time()
    expired = [m for m, data in otp_store.items() if now > data.get('expiresAt', 0)]
    for m in expired:
        otp_store.pop(m, None)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({
            'error': f"File type not permitted. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    safe_name = f"{name}_{int(time.time() * 1000)}{ext.lower()}"

    # If Supabase is configured, upload to public 'complaint-evidence' bucket
    try:
        from server.supabase_client import is_supabase_configured, get_supabase_client
        if is_supabase_configured():
            client = get_supabase_client()
            if client:
                file_bytes = file.read()
                file.seek(0)
                storage_path = f"evidence/{safe_name}"
                client.storage.from_('complaint-evidence').upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.mimetype or "application/octet-stream"}
                )
                public_url = client.storage.from_('complaint-evidence').get_public_url(storage_path)
                return jsonify({
                    'success': True,
                    'fileUrl': public_url,
                    'filename': file.filename
                })
    except Exception as st_err:
        file.seek(0)

    dest_path = os.path.join(UPLOADS_DIR, safe_name)
    file.save(dest_path)

    return jsonify({
        'success': True,
        'fileUrl': f"/uploads/{safe_name}",
        'filename': file.filename
    })


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)


# --- AUTHENTICATION ENDPOINTS ---

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    clean_expired_otps()
    data = request.get_json() or {}
    raw_mobile = data.get('mobile')
    valid, err, clean_mobile = validate_indian_mobile(raw_mobile)
    if not valid:
        return jsonify({'error': err}), 400

    role = (data.get('role') or '').strip().lower()
    if role not in ['student', 'teacher']:
        role = 'student'

    now = time.time()
    stored = otp_store.get(clean_mobile)

    # 1. Enforce 30-second resend cooldown
    if stored and (now - stored.get('lastSentAt', 0)) < 30:
        remaining = int(30 - (now - stored.get('lastSentAt', 0)))
        return jsonify({
            'error': f"Please wait {remaining} seconds before requesting a new OTP.",
            'cooldownRemaining': remaining
        }), 429

    # 2. Generate unique, cryptographically secure 6-digit random code (never fixed, never demo)
    otp_code = generate_secure_otp()

    # 3. Check if user already exists to store authentic role context
    existing_user = db.find_one('users', lambda u: u.get('mobile') == clean_mobile)
    stored_role = existing_user.get('role') if existing_user else (role if role in ['student', 'teacher'] else 'student')

    # 4. Store OTP with strict 5-minute expiry and invalidate any previous code
    otp_store[clean_mobile] = {
        'code': otp_code,
        'expiresAt': now + 300,  # 5 minutes expiry
        'lastSentAt': now,
        'attempts': 0,
        'role': stored_role
    }

    # Persist in Supabase for multi-container serverless synchronization
    try:
        from server.supabase_client import is_supabase_configured, get_supabase_client
        if is_supabase_configured():
            client_sb = get_supabase_client()
            if client_sb:
                client_sb.table('notifications').delete().eq('user_id', clean_mobile).eq('type', 'otp_auth').execute()
                client_sb.table('notifications').insert({
                    'id': f"otp-{int(now * 1000)}",
                    'user_id': clean_mobile,
                    'role': stored_role,
                    'title': 'OTP_CODE',
                    'message': otp_code,
                    'type': 'otp_auth',
                    'is_read': False,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }).execute()
    except Exception:
        pass

    # 5. Return the dynamically generated OTP to display in top banner on login page
    return jsonify({
        'success': True,
        'otp': otp_code,
        'message': 'Your OTP is ready. Enter the code displayed above.',
        'expiresInSeconds': 300,
        'resendCooldown': 30
    })


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    raw_mobile = data.get('mobile')
    otp = str(data.get('otp', '')).strip()

    if not raw_mobile or not otp:
        return jsonify({'error': 'Mobile number and 6-digit verification code are required.'}), 400

    valid, err, clean_mobile = validate_indian_mobile(raw_mobile)
    if not valid:
        return jsonify({'error': err}), 400

    if len(otp) != 6 or not otp.isdigit():
        return jsonify({'error': 'Verification code must be exactly 6 digits.'}), 400

    stored = get_active_otp(clean_mobile)
    if not stored:
        return jsonify({'error': 'OTP expired. Please request a new OTP.'}), 400

    now = time.time()
    # Check 5-minute expiry
    if now > stored.get('expiresAt', 0):
        clear_active_otp(clean_mobile)
        return jsonify({'error': 'OTP expired. Please request a new OTP.'}), 400

    # Check attempt limit (max 5)
    if stored.get('attempts', 0) >= 5:
        clear_active_otp(clean_mobile)
        return jsonify({'error': 'Too many incorrect attempts. Please request a new OTP.'}), 429

    # Strict code match: Incorrect OTP rejected
    if stored['code'] != otp:
        stored['attempts'] += 1
        remaining_attempts = max(0, 5 - stored['attempts'])
        return jsonify({
            'error': 'Incorrect OTP. Please try again.',
            'attemptsRemaining': remaining_attempts
        }), 400

    # Determine target role from request body or stored OTP
    target_role = (data.get('role') or stored.get('role') or 'student').strip().lower()

    # Successful verification: Invalidate OTP immediately to prevent reuse
    clear_active_otp(clean_mobile)

    # Check if a user with this normalized mobile number already exists in database
    user = db.find_one('users', lambda u: u.get('mobile') == clean_mobile)

    if not user:
        # User does not exist - safely create account depending on target role
        colleges = [c for c in db.get('colleges') if c.get('status') == 'active']
        default_college = colleges[0] if colleges else {'id': '5555', 'name': 'Default College', 'code': 'COL'}
        college_id = str(default_college.get('id', '5555'))

        if target_role == 'teacher':
            # Create a teacher approval request after successful OTP verification
            teachers_in_col = len(db.find('users', lambda u: str(u.get('collegeId')) == college_id and u.get('role') == 'teacher')) + 1
            teacher_id = f"{college_id}-T{100 + teachers_in_col}"
            user_id = f"USR-T{random.randint(1000, 9999)}"

            user = {
                'id': user_id,
                'role': 'teacher',
                'name': f"Prof. Teacher {clean_mobile[-4:]}",
                'mobile': clean_mobile,
                'email': f"teacher.{clean_mobile[-4:]}@{default_college.get('code', 'college').lower()}.edu",
                'passwordHash': None,
                'collegeId': college_id,
                'collegeName': default_college.get('name'),
                'studentId': None,
                'teacherId': teacher_id,
                'department': 'Faculty',
                'isVerified': False,
                'maskedName': None,
                'complaintLimit': 10,
                'complaintsSubmitted': 0,
                'resolvedCount': 0,
                'activeAssignedCount': 0,
                'status': 'active',
                'approvalStatus': 'Waiting for Approval',
                'warningCount': 0,
                'createdAt': datetime.now(timezone.utc).isoformat(),
                'updatedAt': None
            }
            db.insert('users', user)
            db.notify(
                'USR-00001',
                'admin',
                'New Teacher Awaiting Verification',
                f"Teacher (+91 {clean_mobile}) requested login access for {default_college.get('name')}. Please review and approve.",
                None,
                'update'
            )
            return jsonify({
                'error': 'Your account is waiting for Admin approval.',
                'approvalStatus': 'Waiting for Approval'
            }), 403

        else:
            # Safely initialize appropriate student account without requiring advance registration
            students_in_col = len(db.find('users', lambda u: str(u.get('collegeId')) == college_id and u.get('role') == 'student')) + 1
            student_id = f"{college_id}-S{str(students_in_col).zfill(2)}"
            user_id = f"USR-S{random.randint(10000, 99999)}"
            masked_name = f"Student #{hex(random.randint(4096, 65535))[2:].upper()}"

            user = {
                'id': user_id,
                'role': 'student',
                'name': f"Student {clean_mobile[-4:]}",
                'mobile': clean_mobile,
                'email': f"{user_id.lower()}@student.{default_college.get('code', 'college').lower()}.edu",
                'collegeId': college_id,
                'collegeName': default_college.get('name'),
                'studentId': student_id,
                'teacherId': None,
                'department': None,
                'isVerified': False,
                'maskedName': masked_name,
                'complaintLimit': 10,
                'complaintsSubmitted': 0,
                'resolvedCount': 0,
                'activeAssignedCount': 0,
                'status': 'active',
                'warningCount': 0,
                'createdAt': datetime.now(timezone.utc).isoformat(),
                'updatedAt': None
            }
            db.insert('users', user)
            db.notify(
                user['id'],
                'student',
                'Account Created Successfully',
                f"Your student account has been activated for {default_college.get('name')}.",
                None,
                'submission'
            )
            token = generate_jwt_token(user)
            return jsonify({
                'success': True,
                'user': user,
                'role': 'student',
                'token': token,
                'message': 'Login successful. Welcome!'
            })

    # User already exists in database - preserve all user data and complaint records
    user_role = user.get('role')
    if user_role == 'teacher':
        approval_status = compute_teacher_approval_status(user)
        if approval_status == 'Approved':
            token = generate_jwt_token(user)
            return jsonify({
                'success': True,
                'user': user,
                'role': 'teacher',
                'token': token,
                'message': 'Login successful. Welcome!'
            })
        elif approval_status == 'Not Approved':
            return jsonify({
                'error': 'Your account has been rejected or is not approved by Admin.',
                'approvalStatus': 'Not Approved'
            }), 403
        else:
            return jsonify({
                'error': 'Your account is waiting for Admin approval.',
                'approvalStatus': 'Waiting for Approval'
            }), 403

    elif user_role == 'student':
        if user.get('status') == 'blocked':
            return jsonify({'error': 'Your account has been blocked due to system policy violations.'}), 403

        token = generate_jwt_token(user)
        return jsonify({
            'success': True,
            'user': user,
            'role': 'student',
            'token': token,
            'message': 'Login successful. Welcome!'
        })

    elif user_role == 'admin':
        token = generate_jwt_token(user)
        return jsonify({
            'success': True,
            'user': user,
            'role': 'admin',
            'token': token,
            'message': 'Login successful. Welcome!'
        })

    else:
        return jsonify({'error': 'Invalid role specified.'}), 400



@app.route('/api/auth/register-student', methods=['POST'])
def register_student():
    data = request.get_json() or {}
    mobile = data.get('mobile')
    name = (data.get('name') or '').strip()
    college_id = str(data.get('collegeId') or '').strip()
    email = (data.get('email') or '').strip()

    if not mobile or not name or not college_id:
        return jsonify({'error': 'Mobile, Full Name, and College ID are required.'}), 400

    valid, err, clean_mobile = validate_indian_mobile(mobile)
    if not valid:
        return jsonify({'error': err}), 400

    # If verification OTP was submitted, validate it against active OTP store
    submitted_otp = str(data.get('otp') or '').strip()
    if submitted_otp:
        stored = get_active_otp(clean_mobile)
        now = time.time()
        if not stored or now > stored.get('expiresAt', 0):
            return jsonify({'error': 'OTP expired. Please request a new OTP.'}), 400
        if stored.get('code') != submitted_otp:
            return jsonify({'error': 'Incorrect OTP. Please try again.'}), 400
        clear_active_otp(clean_mobile)

    existing = db.find_one('users', lambda u: u.get('mobile') == clean_mobile and u.get('role') == 'student')
    if existing:
        return jsonify({'error': 'A student account is already registered with this mobile number. Please log in.'}), 400

    college = db.find_by_id('colleges', college_id)
    if not college:
        return jsonify({'error': f"College with ID {college_id} does not exist."}), 400
    if college.get('status') != 'active':
        return jsonify({'error': f"College {college.get('name')} is currently {college.get('status')}. Cannot register."}), 400

    students_in_college = len(db.find('users', lambda u: str(u.get('collegeId')) == college_id and u.get('role') == 'student')) + 1
    student_id = f"{college_id}-S{str(students_in_college).zfill(2)}"
    user_id = f"USR-{random.randint(10000, 99999)}"
    masked_name = f"Student #{hex(random.randint(4096, 65535))[2:].upper()}"

    new_user = {
        'id': user_id,
        'role': 'student',
        'name': name,
        'mobile': clean_mobile,
        'email': email or f"{user_id.lower()}@student.{college.get('code', 'college').lower()}.edu",
        'collegeId': college_id,
        'studentId': student_id,
        'maskedName': masked_name,
        'complaintLimit': 10,
        'complaintsSubmitted': 0,
        'status': 'active',
        'warningCount': 0,
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('users', new_user)
    db.notify(
        new_user['id'],
        'student',
        'Account Registered Successfully',
        f"Your student account is active for {college.get('name')}. Your Student ID is {student_id}.",
        None,
        'submission'
    )

    token = generate_jwt_token(new_user)
    return jsonify({
        'success': True,
        'message': 'Student registered successfully',
        'user': new_user,
        'token': token
    }), 201


@app.route('/api/auth/login-teacher', methods=['POST'])
def login_teacher():
    data = request.get_json() or {}
    identifier = (data.get('identifier') or '').strip()
    password = data.get('password') or ''

    if not identifier or not password:
        return jsonify({'error': 'Teacher ID / Email and Password are required.'}), 400

    teacher = db.find_one(
        'users',
        lambda u: u.get('role') == 'teacher' and (
            u.get('teacherId') == identifier or
            u.get('email') == identifier or
            u.get('mobile') == identifier
        )
    )

    if not teacher:
        return jsonify({'error': 'No teacher account found with these credentials.'}), 401

    if teacher.get('status') == 'blocked':
        return jsonify({'error': 'Your account has been deactivated. Please contact the administrator.'}), 403

    pw_hash = teacher.get('passwordHash') or ''
    is_valid = False
    try:
        is_valid = bcrypt.checkpw(password.encode('utf-8'), pw_hash.encode('utf-8'))
    except Exception:
        is_valid = False

    if not is_valid:
        return jsonify({'error': 'Invalid password. Please verify your credentials.'}), 401

    if compute_teacher_approval_status(teacher) != 'Approved':
        return jsonify({'error': 'Your account is waiting for Admin approval. You can log in after your account is approved.'}), 403

    token = generate_jwt_token(teacher)
    return jsonify({
        'success': True,
        'message': 'Teacher authenticated successfully',
        'user': teacher,
        'token': token
    })


@app.route('/api/auth/register-teacher', methods=['POST'])
def register_teacher():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    mobile = (data.get('mobile') or '').strip()
    email = (data.get('email') or '').strip()
    college_id = str(data.get('collegeId') or '').strip()
    custom_teacher_id = (data.get('teacherId') or data.get('employeeId') or '').strip()
    department = (data.get('department') or 'General Department').strip()
    designation = (data.get('designation') or 'Assistant Professor').strip()
    password = data.get('password') or ''

    if not name or not mobile or not college_id or not password:
        return jsonify({'error': 'Name, Mobile, College ID, and Password are required.'}), 400

    valid, err, clean_mobile = validate_indian_mobile(mobile)
    if not valid:
        return jsonify({'error': err}), 400

    # If verification OTP was submitted, validate it against active OTP store
    submitted_otp = str(data.get('otp') or '').strip()
    if submitted_otp:
        stored = get_active_otp(clean_mobile)
        now = time.time()
        if not stored or now > stored.get('expiresAt', 0):
            return jsonify({'error': 'OTP expired. Please request a new OTP.'}), 400
        if stored.get('code') != submitted_otp:
            return jsonify({'error': 'Incorrect OTP. Please try again.'}), 400
        clear_active_otp(clean_mobile)

    college = db.find_by_id('colleges', college_id)
    if not college:
        return jsonify({'error': f"College with ID {college_id} does not exist."}), 400

    # Prevent duplicate teacher accounts using the same mobile number
    existing_mob = db.find_one('users', lambda u: u.get('mobile') == clean_mobile)
    if existing_mob:
        return jsonify({'error': 'An account is already registered with this mobile number. Please log in or use another number.'}), 400

    teachers_in_col = len(db.find('users', lambda u: str(u.get('collegeId')) == college_id and u.get('role') == 'teacher')) + 1
    teacher_id = custom_teacher_id if custom_teacher_id else f"{college_id}-T{100 + teachers_in_col}"

    # Prevent duplicate teacher accounts using the same Teacher ID / Employee ID
    existing_tid = db.find_one('users', lambda u: u.get('role') == 'teacher' and str(u.get('teacherId', '')).strip().lower() == teacher_id.lower())
    if existing_tid:
        return jsonify({'error': f'Teacher ID / Employee ID "{teacher_id}" is already registered. Please choose a different ID.'}), 400

    user_id = f"USR-T{random.randint(1000, 9999)}"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    new_teacher = {
        'id': user_id,
        'role': 'teacher',
        'name': name,
        'mobile': clean_mobile,
        'email': email or f"teacher.{teachers_in_col}@{college.get('code', 'college').lower()}.edu",
        'passwordHash': hashed,
        'collegeId': college_id,
        'collegeName': college.get('name'),
        'teacherId': teacher_id,
        'department': department,
        'designation': designation,
        'isVerified': False,
        'status': 'active',
        'approvalStatus': 'Waiting for Approval',
        'resolvedCount': 0,
        'activeAssignedCount': 0,
        'warningCount': 0,
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('users', new_teacher)
    db.notify(
        'USR-00001',
        'admin',
        'New Teacher Awaiting Verification',
        f"{name} ({teacher_id}) has registered for {college.get('name')}. Please review and approve.",
        None,
        'update'
    )

    return jsonify({
        'success': True,
        'message': 'Your registration has been submitted successfully. Please wait for Admin approval.',
        'teacherId': teacher_id,
        'user': new_teacher
    }), 201


@app.route('/api/auth/login-admin', methods=['POST'])
def login_admin():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Admin Email and Password are required.'}), 400

    admin = db.find_one('users', lambda u: u.get('role') == 'admin' and u.get('email', '').lower() == email)
    if not admin:
        return jsonify({'error': 'Invalid administrator credentials.'}), 401

    pw_hash = admin.get('passwordHash') or ''
    is_valid = False
    try:
        is_valid = bcrypt.checkpw(password.encode('utf-8'), pw_hash.encode('utf-8'))
    except Exception:
        is_valid = False

    if not is_valid:
        return jsonify({'error': 'Invalid administrator password.'}), 401

    token = generate_jwt_token(admin)
    return jsonify({
        'success': True,
        'message': 'Admin authenticated successfully',
        'user': admin,
        'token': token
    })


@app.route('/api/auth/me', methods=['GET'])
@auth_required
def get_me():
    return jsonify({'user': g.user})


# --- COLLEGE ENDPOINTS ---

@app.route('/api/colleges', methods=['GET'])
def get_colleges():
    stats = compute_college_stats()
    return jsonify({'colleges': stats})


@app.route('/api/colleges/rankings', methods=['GET'])
def get_rankings():
    stats = compute_college_stats()
    most_active = sorted(stats, key=lambda c: c.get('totalComplaints', 0), reverse=True)
    highest_pending = sorted(stats, key=lambda c: c.get('pendingComplaints', 0), reverse=True)
    best_resolution = sorted(stats, key=lambda c: c.get('resolutionRate', 0), reverse=True)

    return jsonify({
        'rankings': {
            'mostActive': most_active,
            'highestPending': highest_pending,
            'bestResolution': best_resolution
        },
        'allColleges': stats
    })


@app.route('/api/colleges/<id>', methods=['GET'])
def get_college_by_id(id):
    stats = compute_college_stats()
    college = next((c for c in stats if str(c.get('id')) == str(id)), None)
    if not college:
        return jsonify({'error': f"College with ID {id} not found"}), 404
    return jsonify({'college': college})


@app.route('/api/colleges/register', methods=['POST'])
def register_college_public():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    code = (data.get('code') or '').strip().upper()
    principal_name = (data.get('principalName') or '').strip()
    contact_email = (data.get('contactEmail') or '').strip()
    contact_phone = (data.get('contactPhone') or '').strip()
    address = (data.get('address') or '').strip()

    if not name or not code:
        return jsonify({'error': 'College Name and Code are required'}), 400

    col_id = str(random.randint(1000, 9999))
    while db.find_by_id('colleges', col_id):
        col_id = str(random.randint(1000, 9999))

    new_college = {
        'id': col_id,
        'name': name,
        'code': code,
        'principalName': principal_name,
        'contactEmail': contact_email,
        'contactPhone': contact_phone,
        'address': address,
        'status': 'active',
        'registeredFrom': 'public_portal',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('colleges', new_college)
    db.notify(
        'USR-00001',
        'admin',
        'New College Onboarded',
        f"College '{name}' (ID: {col_id}) registered via Public Portal.",
        None,
        'update'
    )

    return jsonify({
        'success': True,
        'message': f"College registered successfully with permanent ID: {col_id}",
        'college': new_college
    }), 201


@app.route('/api/colleges', methods=['POST'])
@role_required('admin')
def create_college():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    code = (data.get('code') or '').strip().upper()
    custom_id = str(data.get('customId') or '').strip()

    if not name or not code:
        return jsonify({'error': 'College Name and Code are required'}), 400

    if custom_id:
        if db.find_by_id('colleges', custom_id):
            return jsonify({'error': f"College ID {custom_id} already exists."}), 400
        col_id = custom_id
    else:
        col_id = str(random.randint(1000, 9999))
        while db.find_by_id('colleges', col_id):
            col_id = str(random.randint(1000, 9999))

    new_college = {
        'id': col_id,
        'name': name,
        'code': code,
        'principalName': (data.get('principalName') or '').strip(),
        'contactEmail': (data.get('contactEmail') or '').strip(),
        'contactPhone': (data.get('contactPhone') or '').strip(),
        'address': (data.get('address') or '').strip(),
        'affiliation': (data.get('affiliation') or '').strip(),
        'status': data.get('status') or 'active',
        'registeredFrom': 'admin_console',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('colleges', new_college)
    return jsonify({
        'success': True,
        'message': f"College registered successfully with permanent ID: {col_id}",
        'college': new_college
    }), 201


@app.route('/api/colleges/<id>', methods=['PATCH'])
@role_required('admin')
def update_college(id):
    college = db.find_by_id('colleges', id)
    if not college:
        return jsonify({'error': f"College {id} not found"}), 404

    data = request.get_json() or {}
    allowed = ['name', 'code', 'status', 'principalName', 'contactEmail', 'contactPhone', 'address', 'affiliation']
    updates = {k: v for k, v in data.items() if k in allowed}

    updated = db.update('colleges', id, updates)
    return jsonify({
        'success': True,
        'message': 'College updated successfully',
        'college': updated
    })


@app.route('/api/colleges/<id>', methods=['DELETE'])
@role_required('admin')
def delete_college(id):
    college = db.find_by_id('colleges', id)
    if not college:
        return jsonify({'error': f"College {id} not found"}), 404

    db.delete('colleges', id)
    return jsonify({
        'success': True,
        'message': f"College {id} removed successfully"
    })


# --- COMPLAINTS ENDPOINTS ---

@app.route('/api/complaints/public', methods=['GET'])
def get_public_complaints():
    search = (request.args.get('search') or '').strip().lower()
    college_id = (request.args.get('collegeId') or '').strip()
    category = (request.args.get('category') or '').strip()
    priority = (request.args.get('priority') or '').strip()
    status = (request.args.get('status') or '').strip()
    date_from = request.args.get('dateFrom')
    date_to = request.args.get('dateTo')

    complaints = db.get('complaints')
    colleges = db.get('colleges')
    colleges_map = {str(c.get('id')): c.get('name') for c in colleges}

    is_admin = g.user and g.user.get('role') == 'admin'

    filtered = []
    for c in complaints:
        if not is_admin:
            if c.get('status') in ['Pending', 'Rejected'] or c.get('visibility') == 'Confidential':
                continue

        if college_id and str(c.get('collegeId')) != college_id:
            continue
        if category and category != 'All' and c.get('category', '').lower() != category.lower():
            continue
        if priority and priority != 'All' and c.get('priority', '').lower() != priority.lower():
            continue
        if status and status != 'All' and c.get('status', '').lower() != status.lower():
            continue

        if search:
            c_id = c.get('id', '').lower()
            c_col_id = str(c.get('collegeId', '')).lower()
            c_col_name = (colleges_map.get(str(c.get('collegeId')), '')).lower()
            c_title = c.get('title', '').lower()
            c_desc = c.get('description', '').lower()
            if not any(search in field for field in [c_id, c_col_id, c_col_name, c_title, c_desc]):
                continue

        if date_from:
            try:
                from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                c_dt = datetime.fromisoformat(c.get('createdAt').replace('Z', '+00:00'))
                if c_dt < from_dt:
                    continue
            except Exception:
                pass

        if date_to:
            try:
                to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                c_dt = datetime.fromisoformat(c.get('createdAt').replace('Z', '+00:00'))
                if c_dt > to_dt:
                    continue
            except Exception:
                pass

        filtered.append(c)

    results = []
    for c in filtered:
        masked = mask_complaint_privacy(c, g.user)
        masked['collegeName'] = colleges_map.get(str(c.get('collegeId')), f"College {c.get('collegeId')}")
        results.append(masked)

    return jsonify({'complaints': results, 'count': len(results)})


@app.route('/api/complaints/my', methods=['GET'])
@role_required('student')
def get_my_complaints():
    complaints = db.find('complaints', lambda c: c.get('studentUserId') == g.user.get('id'))
    colleges = db.get('colleges')
    colleges_map = {str(c.get('id')): c.get('name') for c in colleges}

    results = []
    for c in complaints:
        masked = mask_complaint_privacy(c, g.user)
        masked['collegeName'] = colleges_map.get(str(c.get('collegeId')), f"College {c.get('collegeId')}")
        results.append(masked)

    return jsonify({'complaints': results})


@app.route('/api/complaints/teacher', methods=['GET'])
@role_required('teacher')
def get_teacher_complaints():
    t_id = g.user.get('id')
    t_ref = g.user.get('teacherId')
    complaints = db.find('complaints', lambda c: c.get('assignedTeacherId') in [t_id, t_ref])
    colleges = db.get('colleges')
    colleges_map = {str(c.get('id')): c.get('name') for c in colleges}

    results = []
    for c in complaints:
        masked = mask_complaint_privacy(c, g.user)
        masked['collegeName'] = colleges_map.get(str(c.get('collegeId')), f"College {c.get('collegeId')}")
        results.append(masked)

    return jsonify({'complaints': results})


@app.route('/api/complaints/<id>', methods=['GET'])
def get_complaint_by_id(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint with ID {id} not found"}), 404

    if complaint.get('visibility') == 'Confidential':
        is_allowed = g.user and (
            g.user.get('role') == 'admin' or
            g.user.get('id') == complaint.get('studentUserId') or
            g.user.get('id') == complaint.get('assignedTeacherId')
        )
        if not is_allowed:
            return jsonify({'error': 'This complaint is confidential and restricted to authorized personnel.'}), 403

    colleges = db.get('colleges')
    college = next((c for c in colleges if str(c.get('id')) == str(complaint.get('collegeId'))), None)
    masked = mask_complaint_privacy(complaint, g.user)
    masked['collegeName'] = college.get('name') if college else f"College {complaint.get('collegeId')}"

    activities = db.find('activityLogs', lambda a: a.get('complaintId') == id)
    activities.sort(key=lambda a: a.get('timestamp', ''), reverse=True)

    comments = db.find('comments', lambda c: c.get('complaintId') == id)
    comments.sort(key=lambda c: c.get('createdAt', ''))

    return jsonify({
        'complaint': masked,
        'activities': activities,
        'comments': comments
    })


@app.route('/api/complaints', methods=['POST'])
@role_required('student')
def create_complaint():
    user = g.user
    if user.get('status') in ['blocked', 'restricted']:
        return jsonify({'error': f"Your account is currently {user.get('status')}. You cannot submit new complaints."}), 403

    data = request.get_json() or {}
    college_id = str(data.get('collegeId') or '').strip()
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    category = data.get('category')
    priority = data.get('priority') or 'Medium'
    is_anonymous = bool(data.get('isAnonymous'))
    proof_url = data.get('proofUrl')
    proof_name = data.get('proofName')

    if not college_id or not title or not description or not category:
        return jsonify({'error': 'College ID, Title, Description, and Category are required.'}), 400

    # Rule: Match student registered college
    if college_id != str(user.get('collegeId')):
        return jsonify({
            'error': f"College ID mismatch: You are registered under College {user.get('collegeId')}. You cannot submit a complaint for College {college_id}."
        }), 400

    # Rule: College must exist and be active
    college = db.find_by_id('colleges', college_id)
    if not college:
        return jsonify({'error': f"College {college_id} does not exist."}), 404
    if college.get('status') != 'active':
        return jsonify({'error': f"College {college.get('name')} is currently {college.get('status')}. Cannot receive new complaints."}), 400

    # Rule: Check 10-quota limit
    current_submitted = user.get('complaintsSubmitted', 0)
    current_limit = user.get('complaintLimit', 10)
    if current_submitted >= current_limit:
        return jsonify({
            'error': f"Complaint limit of {current_limit} reached. Please contact your college administrator to extend your quota (+10 complaints)."
        }), 403

    # Generate unique complaint ID
    comp_id = f"CMP-{random.randint(10000, 99999)}"
    while db.find_by_id('complaints', comp_id):
        comp_id = f"CMP-{random.randint(10000, 99999)}"

    valid_priority = priority if priority in ['Low', 'Medium', 'High', 'Urgent'] else 'Medium'
    sla_h = SLA_HOURS.get(valid_priority, 72)
    is_sensitive = (category == 'Harassment/Safety')

    proofs = []
    if proof_url:
        proofs.append({
            'id': f"prf-{int(time.time() * 1000)}",
            'name': proof_name or 'Evidence_attachment',
            'url': proof_url,
            'uploadedByRole': 'student',
            'uploadedAt': datetime.now(timezone.utc).isoformat()
        })

    now_iso = datetime.now(timezone.utc).isoformat()
    new_complaint = {
        'id': comp_id,
        'collegeId': college_id,
        'studentUserId': user.get('id'),
        'studentName': user.get('name'),
        'studentMobile': user.get('mobile'),
        'studentAnonymousId': user.get('maskedName') or f"Student #{hex(random.randint(4096, 65535))[2:].upper()}",
        'maskedName': user.get('maskedName') or f"Student #{hex(random.randint(4096, 65535))[2:].upper()}",
        'isAnonymous': is_anonymous,
        'title': title,
        'description': description,
        'category': category,
        'priority': valid_priority,
        'status': 'Pending',
        'visibility': 'Restricted' if is_sensitive else 'Public',
        'rejectionReason': None,
        'assignedTeacherId': None,
        'assignedTeacherName': None,
        'assignedTeacherCollegeId': None,
        'assignedTeacherRefId': None,
        'assignedAt': None,
        'slaHours': sla_h,
        'deadlineAt': None,
        'isEscalated': False,
        'escalatedAt': None,
        'escalationReason': None,
        'escalatedTo': None,
        'proofs': proofs,
        'resolutionProof': None,
        'verification': {'status': 'Pending'},
        'verificationStatus': 'Pending',
        'createdAt': now_iso,
        'updatedAt': now_iso,
        'resolvedAt': None,
        'completedAt': None
    }

    try:
        db.insert('complaints', new_complaint)
    except Exception as err:
        return jsonify({
            'error': 'Failed to save complaint to database. Please check connection and try again.',
            'details': str(err)
        }), 500

    # Decrement quota and log activity ONLY AFTER the database insert succeeds
    db.update('users', user.get('id'), {'complaintsSubmitted': current_submitted + 1})

    actor_display = 'Anonymous Student' if is_anonymous else user.get('maskedName')
    db.log_activity(
        comp_id,
        'SUBMITTED',
        'student',
        actor_display,
        f"Complaint submitted for College {college_id} (Category: {category}, Priority: {valid_priority}). Quota used: {current_submitted + 1}/{current_limit}."
    )

    db.notify(
        user.get('id'),
        'student',
        'Complaint Submitted Successfully',
        f"Your complaint {comp_id} has been submitted and is under Admin review.",
        comp_id,
        'submission'
    )

    db.notify(
        'USR-00001',
        'admin',
        'New Complaint Awaiting Review',
        f"New complaint {comp_id} submitted for {college.get('name')} ({category} - {valid_priority}).",
        comp_id,
        'submission'
    )

    masked = mask_complaint_privacy(new_complaint, user)
    return jsonify({
        'success': True,
        'message': f"Complaint {comp_id} registered successfully",
        'complaint': masked,
        'remainingQuota': current_limit - (current_submitted + 1)
    }), 201


@app.route('/api/complaints/<id>/review', methods=['PATCH'])
@role_required('admin')
def review_complaint(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    action = data.get('action')
    reason = (data.get('reason') or '').strip()
    visibility = data.get('visibility')

    if action == 'reject':
        if not reason:
            return jsonify({'error': 'A valid rejection reason is mandatory when rejecting a complaint.'}), 400

        updated = db.update('complaints', id, {
            'status': 'Rejected',
            'rejectionReason': reason,
            'updatedAt': datetime.now(timezone.utc).isoformat()
        })

        db.log_activity(id, 'REJECTED', 'admin', 'Administrator', f"Complaint rejected. Reason: {reason}")
        db.notify(
            complaint.get('studentUserId'),
            'student',
            'Complaint Rejected by Admin',
            f"Your complaint {id} was rejected. Reason: {reason}",
            id,
            'rejection'
        )
        return jsonify({'success': True, 'message': 'Complaint rejected', 'complaint': updated})

    elif action == 'approve':
        valid_vis = visibility if visibility in ['Public', 'Restricted', 'Confidential'] else complaint.get('visibility', 'Public')
        updated = db.update('complaints', id, {
            'status': 'Approved',
            'visibility': valid_vis,
            'rejectionReason': None,
            'updatedAt': datetime.now(timezone.utc).isoformat()
        })

        db.log_activity(id, 'APPROVED', 'admin', 'Administrator', f"Complaint approved for investigation. Visibility set to: {valid_vis}.")
        db.notify(
            complaint.get('studentUserId'),
            'student',
            'Complaint Approved',
            f"Your complaint {id} has been approved by Admin and is queued for teacher assignment.",
            id,
            'approval'
        )
        return jsonify({'success': True, 'message': 'Complaint approved', 'complaint': updated})

    return jsonify({'error': 'Invalid action. Must be "approve" or "reject".'}), 400


@app.route('/api/complaints/<id>/assign', methods=['PATCH'])
@role_required('admin')
def assign_teacher(id):
    data = request.get_json() or {}
    teacher_id = data.get('teacherId')

    if not teacher_id:
        return jsonify({'error': 'Teacher selection is required'}), 400

    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    # Locate teacher by id or teacherId
    teacher = db.find_one(
        'users',
        lambda u: u.get('role') == 'teacher' and (u.get('id') == teacher_id or u.get('teacherId') == teacher_id)
    )
    if not teacher:
        return jsonify({'error': 'Selected user is not a valid teacher'}), 400

    if compute_teacher_approval_status(teacher) != 'Approved':
        return jsonify({'error': f"Teacher {teacher.get('name')} is waiting for Admin approval and cannot be assigned complaints yet."}), 400

    if teacher.get('status') == 'blocked':
        return jsonify({'error': f"Teacher {teacher.get('name')} account is blocked."}), 400

    if str(teacher.get('collegeId')) != str(complaint.get('collegeId')):
        return jsonify({
            'error': f"Teacher {teacher.get('name')} belongs to College {teacher.get('collegeId')}, but complaint is for College {complaint.get('collegeId')}. Must assign from the same college."
        }), 400

    active_tasks = db.find(
        'complaints',
        lambda c: c.get('assignedTeacherId') in [teacher.get('id'), teacher.get('teacherId')] and c.get('status') not in ['Completed', 'Rejected']
    )
    if len(active_tasks) >= 10:
        return jsonify({
            'error': f"Teacher {teacher.get('name')} already has {len(active_tasks)} active complaints assigned. They must complete these complaints before receiving more."
        }), 400

    now = datetime.now(timezone.utc)
    sla_h = complaint.get('slaHours') or SLA_HOURS.get(complaint.get('priority'), 72)
    deadline = now + timedelta(hours=sla_h)

    updated = db.update('complaints', id, {
        'assignedTeacherId': teacher.get('id'),
        'assignedTeacherName': teacher.get('name'),
        'assignedTeacherCollegeId': teacher.get('collegeId'),
        'assignedTeacherRefId': teacher.get('teacherId'),
        'assignedAt': now.isoformat(),
        'deadlineAt': deadline.isoformat(),
        'status': 'In Progress',
        'updatedAt': now.isoformat()
    })

    db.log_activity(
        id,
        'ASSIGNED',
        'admin',
        'Administrator',
        f"Assigned to {teacher.get('name')} (Teacher ID: {teacher.get('teacherId')}). Resolution timer started ({sla_h}h SLA)."
    )

    db.notify(
        teacher.get('id'),
        'teacher',
        'New Complaint Assigned to You',
        f"You have been assigned {id}: \"{complaint.get('title', '')[:35]}...\". SLA: {sla_h} hours.",
        id,
        'assignment'
    )

    db.notify(
        complaint.get('studentUserId'),
        'student',
        'Teacher Assigned to Your Complaint',
        f"Teacher {teacher.get('name')} ({teacher.get('teacherId')}) has been assigned to work on your complaint.",
        id,
        'assignment'
    )

    return jsonify({
        'success': True,
        'message': f"Assigned to {teacher.get('name')}",
        'complaint': updated
    })


@app.route('/api/complaints/<id>/teacher-update', methods=['PATCH'])
@role_required('teacher')
def teacher_update(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    note = (data.get('note') or '').strip()
    new_status = data.get('newStatus')
    proof_url = data.get('proofUrl')
    proof_name = data.get('proofName')

    updates = {'updatedAt': datetime.now(timezone.utc).isoformat()}
    if new_status and new_status in ['In Progress', 'Assigned']:
        updates['status'] = new_status

    if proof_url:
        proofs = list(complaint.get('proofs', []))
        proofs.append({
            'id': f"prf-{int(time.time() * 1000)}",
            'name': proof_name or 'Teacher_Evidence',
            'url': proof_url,
            'uploadedByRole': 'teacher',
            'uploadedAt': datetime.now(timezone.utc).isoformat()
        })
        updates['proofs'] = proofs

    updated = db.update('complaints', id, updates)

    actor_name = g.user.get('name') if g.user else (complaint.get('assignedTeacherName') or 'Assigned Teacher')
    db.log_activity(id, 'UPDATE_POSTED', 'teacher', actor_name, note or 'Posted progress update on complaint.')

    if note:
        db.insert('comments', {
            'id': f"cmt-{int(time.time() * 1000)}",
            'complaintId': id,
            'userId': g.user.get('id') if g.user else None,
            'authorName': actor_name,
            'authorRole': 'teacher',
            'isOfficial': True,
            'text': note,
            'createdAt': datetime.now(timezone.utc).isoformat()
        })

    db.notify(
        complaint.get('studentUserId'),
        'student',
        'Teacher Posted Progress Update',
        f"Update on {id}: {note[:50] + '...' if note else 'Status updated.'}",
        id,
        'update'
    )

    return jsonify({'success': True, 'complaint': updated})


@app.route('/api/complaints/<id>/resolve', methods=['POST'])
@role_required('teacher')
def resolve_complaint(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    explanation = (data.get('explanation') or '').strip()
    proof_url = data.get('proofUrl')

    if not explanation:
        return jsonify({'error': 'Resolution explanation/proof description is required.'}), 400

    now_iso = datetime.now(timezone.utc).isoformat()
    actor_name = g.user.get('name') if g.user else (complaint.get('assignedTeacherName') or 'Teacher')

    resolution_proof = {
        'text': explanation,
        'proofUrl': proof_url,
        'resolvedBy': actor_name,
        'resolvedAt': now_iso
    }

    updated = db.update('complaints', id, {
        'status': 'Resolved',
        'resolvedAt': now_iso,
        'resolutionProof': resolution_proof,
        'verification': {
            'status': 'Pending',
            'verifiedBy': None,
            'verifiedAt': None,
            'feedback': None
        },
        'updatedAt': now_iso
    })

    db.log_activity(
        id,
        'RESOLVED',
        'teacher',
        actor_name,
        f"Marked as Resolved. Proof/Explanation: {explanation[:80]}... Verification requested."
    )

    db.notify(
        complaint.get('studentUserId'),
        'student',
        'Complaint Marked Resolved - Action Needed',
        f"Teacher has submitted resolution proof for {id}. Please verify whether it is Done or Not Done.",
        id,
        'proof'
    )

    db.notify(
        'USR-00001',
        'admin',
        'Complaint Resolved by Teacher',
        f"{complaint.get('assignedTeacherName')} has marked {id} as Resolved. Awaiting verification.",
        id,
        'status'
    )

    return jsonify({
        'success': True,
        'message': 'Complaint marked as Resolved. Verification pending from student.',
        'complaint': updated
    })


@app.route('/api/complaints/<id>/verify', methods=['POST'])
def verify_resolution(id):
    data = request.get_json() or {}
    decision = data.get('decision')
    feedback = (data.get('feedback') or '').strip()

    if decision not in ['Done', 'Not Done']:
        return jsonify({'error': 'Decision must be "Done" or "Not Done".'}), 400

    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    now_iso = datetime.now(timezone.utc).isoformat()
    is_done = (decision == 'Done')
    verified_by = 'Administrator' if g.user and g.user.get('role') == 'admin' else 'Student'

    verification = {
        'status': decision,
        'verifiedBy': verified_by,
        'verifiedAt': now_iso,
        'feedback': feedback or ('Resolution confirmed by student.' if is_done else 'Problem still persists.')
    }

    updates = {
        'verification': verification,
        'status': 'Completed' if is_done else 'In Progress',
        'completedAt': now_iso if is_done else None,
        'updatedAt': now_iso
    }

    updated = db.update('complaints', id, updates)

    db.log_activity(
        id,
        'COMPLETED' if is_done else 'VERIFIED',
        g.user.get('role') if g.user else 'student',
        verified_by,
        'Resolution verified as Done. Complaint officially completed and closed.' if is_done else f"Resolution rejected (Not Done). Reason: {feedback or 'Problem still exists'}. Returned to In Progress."
    )

    if complaint.get('assignedTeacherId'):
        db.notify(
            complaint.get('assignedTeacherId'),
            'teacher',
            'Complaint Completed' if is_done else 'Resolution Marked Not Done',
            f"Complaint {id} was verified as Done by student and is now Closed." if is_done else f"Student flagged {id} as Not Done: \"{feedback or 'Problem still exists'}\". Please follow up.",
            id,
            'status'
        )

    if is_done and complaint.get('studentUserId'):
        db.notify(
            complaint.get('studentUserId'),
            'student',
            'Complaint Completed',
            f"Complaint {id} has been officially completed. Thank you for your feedback.",
            id,
            'completion'
        )

    return jsonify({
        'success': True,
        'message': 'Complaint marked as Completed.' if is_done else 'Complaint returned to In Progress.',
        'complaint': updated
    })


@app.route('/api/complaints/<id>/escalate', methods=['POST'])
@role_required('admin')
def escalate_complaint(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    reason = (data.get('reason') or 'Resolution timer exceeded SLA threshold.').strip()
    escalated_to = (data.get('escalatedTo') or 'College Principal & Grievance Cell').strip()

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = complaint.get('status') if complaint.get('status') in ['Completed', 'Resolved'] else 'Escalated'

    updated = db.update('complaints', id, {
        'isEscalated': True,
        'escalatedAt': now_iso,
        'escalationReason': reason,
        'escalatedTo': escalated_to,
        'status': new_status,
        'updatedAt': now_iso
    })

    db.log_activity(id, 'ESCALATED', 'admin', g.user.get('name') or 'Administrator', f"Escalated to {escalated_to}. Reason: {reason}")

    db.notify(
        complaint.get('studentUserId'),
        'student',
        'Complaint Escalated to Higher Authority',
        f"Your complaint {id} has been escalated to {escalated_to} for urgent resolution.",
        id,
        'escalation'
    )

    if complaint.get('assignedTeacherId'):
        db.notify(
            complaint.get('assignedTeacherId'),
            'teacher',
            'ESCALATION WARNING',
            f"Complaint {id} has been escalated to {escalated_to} due to resolution delay.",
            id,
            'escalation'
        )

    return jsonify({
        'success': True,
        'message': f"Complaint escalated to {escalated_to}",
        'complaint': updated
    })


@app.route('/api/complaints/<id>/comments', methods=['POST'])
def add_comment(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'Comment text cannot be empty.'}), 400

    author_role = g.user.get('role') if g.user else 'public'
    is_official = author_role in ['teacher', 'admin']

    if not g.user:
        author_name = 'Public Visitor'
    elif g.user.get('role') == 'student':
        author_name = 'Anonymous Student' if complaint.get('isAnonymous') else (g.user.get('maskedName') or 'Student')
    else:
        author_name = g.user.get('name')

    new_comment = {
        'id': f"cmt-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        'complaintId': id,
        'authorId': g.user.get('id') if g.user else None,
        'userId': g.user.get('id') if g.user else None,
        'authorName': author_name,
        'authorRole': author_role,
        'isOfficial': is_official,
        'text': text,
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('comments', new_comment)
    db.log_activity(id, 'COMMENT_ADDED', author_role, author_name, f"Added comment: \"{text[:45]}...\"")

    return jsonify({'success': True, 'comment': new_comment}), 201


@app.route('/api/complaints/<id>/report', methods=['POST'])
def report_complaint(id):
    complaint = db.find_by_id('complaints', id)
    if not complaint:
        return jsonify({'error': f"Complaint {id} not found"}), 404

    data = request.get_json() or {}
    reason = data.get('reason')
    details = (data.get('details') or '').strip()

    if not reason:
        return jsonify({'error': 'Report reason is required.'}), 400

    new_report = {
        'id': f"rep-{int(time.time() * 1000)}",
        'complaintId': id,
        'complaintTitle': complaint.get('title', 'Reported Complaint'),
        'reporterUserId': g.user.get('id') if g.user else None,
        'reporterRole': g.user.get('role') if g.user else 'public',
        'reportedByUserId': g.user.get('id') if g.user else None,
        'reportedByName': g.user.get('name') if g.user else 'Public User',
        'reason': reason,
        'details': details,
        'status': 'pending',
        'adminAction': None,
        'createdAt': datetime.now(timezone.utc).isoformat()
    }

    db.insert('reports', new_report)
    db.notify(
        'USR-00001',
        'admin',
        'New Abuse/Misuse Report Filed',
        f"Complaint {id} has been reported for: \"{reason}\". Please review.",
        id,
        'warning'
    )

    return jsonify({
        'success': True,
        'message': 'Report submitted. The administration will inspect this complaint.',
        'report': new_report
    }), 201


# --- ADMIN ENDPOINTS ---

@app.route('/api/admin/complaints', methods=['GET'])
@role_required('admin')
def get_admin_complaints():
    """
    Dedicated complaints hub endpoint for Admin Dashboard.
    Guarantees authorized administrators access to all complaints (Pending, In Progress,
    Resolved, Rejected, Escalated) with complete complainant details, live counts,
    and institutional metadata.
    """
    search = (request.args.get('search') or '').strip().lower()
    college_id = (request.args.get('collegeId') or '').strip()
    category = (request.args.get('category') or '').strip()
    priority = (request.args.get('priority') or '').strip()
    status = (request.args.get('status') or '').strip()
    page = int(request.args.get('page') or 1)
    limit = int(request.args.get('limit') or 50)
    sort_order = (request.args.get('sort') or 'newest').strip().lower()

    complaints = db.get('complaints')
    colleges = db.get('colleges')
    users = db.get('users')

    colleges_map = {str(c.get('id')): c.get('name') for c in colleges}
    users_map = {str(u.get('id')): u for u in users}

    # Respect college-scoped admin if configured
    admin_col_id = g.user.get('collegeId')
    if admin_col_id and str(admin_col_id).lower() != 'all':
        complaints = [c for c in complaints if str(c.get('collegeId')) == str(admin_col_id)]

    # Compute overall status counts across all complaints authorized for this admin
    counts = {
        'all': len(complaints),
        'pending': sum(1 for c in complaints if c.get('status') == 'Pending'),
        'approved': sum(1 for c in complaints if c.get('status') == 'Approved'),
        'assigned': sum(1 for c in complaints if c.get('status') == 'Assigned'),
        'inProgress': sum(1 for c in complaints if c.get('status') in ['In Progress', 'Not Done']),
        'resolved': sum(1 for c in complaints if c.get('status') == 'Resolved'),
        'completed': sum(1 for c in complaints if c.get('status') == 'Completed'),
        'rejected': sum(1 for c in complaints if c.get('status') == 'Rejected'),
        'escalated': sum(1 for c in complaints if c.get('isEscalated') or c.get('status') == 'Escalated'),
    }

    filtered = []
    for c in complaints:
        if college_id and college_id != 'All' and str(c.get('collegeId')) != college_id:
            continue
        if category and category != 'All' and (c.get('category') or '').lower() != category.lower():
            continue
        if priority and priority != 'All' and (c.get('priority') or '').lower() != priority.lower():
            continue
        if status and status != 'All':
            if status.lower() == 'in progress':
                if c.get('status') not in ['In Progress', 'Not Done', 'Approved', 'Assigned']:
                    continue
            elif status.lower() == 'escalated':
                if not c.get('isEscalated') and c.get('status') != 'Escalated':
                    continue
            elif (c.get('status') or '').lower() != status.lower():
                continue

        if search:
            c_id = (c.get('id') or '').lower()
            c_col_id = str(c.get('collegeId') or '').lower()
            c_col_name = (colleges_map.get(str(c.get('collegeId')), '')).lower()
            c_title = (c.get('title') or '').lower()
            c_desc = (c.get('description') or '').lower()
            c_s_name = (c.get('studentName') or '').lower()
            c_s_anon = (c.get('studentAnonymousId') or '').lower()
            c_t_name = (c.get('assignedTeacherName') or '').lower()
            searchable = [c_id, c_col_id, c_col_name, c_title, c_desc, c_s_name, c_s_anon, c_t_name]
            if not any(search in f for f in searchable):
                continue

        enriched = dict(c)
        enriched['collegeName'] = colleges_map.get(str(c.get('collegeId')), f"College {c.get('collegeId')}")

        # Provide complete real student details to authorized admin
        student = users_map.get(str(c.get('studentUserId')))
        if student:
            enriched['studentRealDetails'] = {
                'name': student.get('name') or c.get('studentName'),
                'mobile': student.get('mobile') or c.get('studentMobile'),
                'email': student.get('email'),
                'studentId': student.get('studentId'),
                'collegeId': student.get('collegeId'),
                'status': student.get('status', 'active'),
                'warningCount': student.get('warningCount', 0),
                'complaintLimit': student.get('complaintLimit', 10),
                'complaintsSubmitted': student.get('complaintsSubmitted', 0)
            }
        else:
            enriched['studentRealDetails'] = {
                'name': c.get('studentName') or 'Registered Student',
                'mobile': c.get('studentMobile'),
                'email': None,
                'studentId': None,
                'collegeId': c.get('collegeId'),
                'status': 'active',
                'warningCount': 0,
                'complaintLimit': 10,
                'complaintsSubmitted': 1
            }

        filtered.append(enriched)

    # Sort records
    if sort_order == 'oldest':
        filtered.sort(key=lambda x: x.get('createdAt') or '')
    else:
        filtered.sort(key=lambda x: x.get('createdAt') or '', reverse=True)

    total_records = len(filtered)
    if limit > 0:
        start_idx = (page - 1) * limit
        paginated = filtered[start_idx:start_idx + limit]
    else:
        paginated = filtered

    return jsonify({
        'success': True,
        'complaints': paginated,
        'total': total_records,
        'counts': counts,
        'statusCounts': counts,
        'page': page,
        'limit': limit
    })


@app.route('/api/admin/analytics', methods=['GET'])
@role_required('admin')
def get_analytics():
    complaints = db.get('complaints')
    colleges = db.get('colleges')
    users = db.get('users')
    reports = db.get('reports')

    total = len(complaints)
    pending = sum(1 for c in complaints if c.get('status') == 'Pending')
    in_progress = sum(1 for c in complaints if c.get('status') in ['Approved', 'Assigned', 'In Progress', 'Not Done'])
    resolved = sum(1 for c in complaints if c.get('status') == 'Resolved')
    completed = sum(1 for c in complaints if c.get('status') == 'Completed')
    rejected = sum(1 for c in complaints if c.get('status') == 'Rejected')
    escalated = sum(1 for c in complaints if c.get('isEscalated') or c.get('status') == 'Escalated')

    category_map = {}
    for c in complaints:
        cat = c.get('category') or 'Other'
        category_map[cat] = category_map.get(cat, 0) + 1

    priority_map = {}
    for c in complaints:
        p = c.get('priority') or 'Medium'
        priority_map[p] = priority_map.get(p, 0) + 1

    completed_list = [c for c in complaints if c.get('status') == 'Completed' and c.get('assignedAt') and c.get('completedAt')]
    avg_turnaround = 0
    if completed_list:
        total_hours = 0
        for c in completed_list:
            try:
                start = datetime.fromisoformat(c.get('assignedAt').replace('Z', '+00:00'))
                end = datetime.fromisoformat(c.get('completedAt').replace('Z', '+00:00'))
                total_hours += (end - start).total_seconds() / 3600
            except Exception:
                pass
        avg_turnaround = round(total_hours / len(completed_list), 1)

    eligible = total - rejected
    resolution_rate = round(((resolved + completed) / eligible) * 100) if eligible > 0 else 0

    return jsonify({
        'metrics': {
            'totalComplaints': total,
            'pendingReview': pending,
            'inProgress': in_progress,
            'resolved': resolved,
            'completed': completed,
            'rejected': rejected,
            'escalated': escalated,
            'systemResolutionRate': resolution_rate,
            'avgTurnaroundHours': avg_turnaround,
            'totalColleges': len(colleges),
            'totalStudents': sum(1 for u in users if u.get('role') == 'student'),
            'totalTeachers': sum(1 for u in users if u.get('role') == 'teacher'),
            'pendingReports': sum(1 for r in reports if r.get('status') == 'pending')
        },
        'categoryBreakdown': category_map,
        'priorityBreakdown': priority_map
    })


@app.route('/api/admin/users', methods=['GET'])
@role_required('admin')
def get_all_users():
    users = db.get('users')
    colleges = db.get('colleges')
    complaints = db.get('complaints')
    colleges_map = {str(c.get('id')): c.get('name') for c in colleges}

    enriched = []
    for u in users:
        u_dict = dict(u)
        u_id = u.get('id')
        user_complaints = [c for c in complaints if c.get('studentUserId') == u_id]
        completed_c = sum(1 for c in user_complaints if c.get('status') == 'Completed')
        active_c = sum(1 for c in user_complaints if c.get('status') not in ['Completed', 'Rejected'])
        u_dict.update({
            'collegeName': colleges_map.get(str(u.get('collegeId')), 'N/A'),
            'completedComplaintsCount': completed_c,
            'activeComplaintsCount': active_c
        })
        if u.get('role') == 'teacher':
            app_status = compute_teacher_approval_status(u)
            u_dict['approvalStatus'] = app_status
            u_dict['accountStatus'] = app_status
        enriched.append(u_dict)

    return jsonify({
        'users': enriched,
        'students': [u for u in enriched if u.get('role') == 'student'],
        'teachers': [u for u in enriched if u.get('role') == 'teacher'],
        'admins': [u for u in enriched if u.get('role') == 'admin']
    })


@app.route('/api/admin/users/<id>/quota', methods=['PATCH'])
@role_required('admin')
def extend_quota(id):
    user = db.find_by_id('users', id)
    if not user or user.get('role') != 'student':
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json() or {}
    amount = int(data.get('amount', 10))

    complaints = db.get('complaints')
    student_complaints = [c for c in complaints if c.get('studentUserId') == id]
    completed_count = sum(1 for c in student_complaints if c.get('status') == 'Completed')

    # RULE: Admin can only give 10 more complaints after the 10 complaints are completed
    if completed_count < 10:
        return jsonify({
            'error': f"Cannot extend quota: Student has only {completed_count}/10 completed complaint(s). All 10 complaints must be completed before granting 10 more complaints."
        }), 400

    active_unresolved = sum(1 for c in student_complaints if c.get('status') not in ['Completed', 'Rejected'])
    if active_unresolved > 0:
        return jsonify({
            'error': f"Cannot extend quota: Student still has {active_unresolved} ongoing complaint(s). All previous complaints must be completed before granting 10 more complaints."
        }), 400

    new_limit = user.get('complaintLimit', 10) + amount
    updated = db.update('users', id, {'complaintLimit': new_limit})

    db.notify(
        user.get('id'),
        'student',
        'Complaint Quota Extended',
        f"Your administrator has granted you an additional {amount} complaints after verifying your completed complaints. Your new limit is {new_limit}.",
        None,
        'limit'
    )

    return jsonify({
        'success': True,
        'message': f"Quota for {user.get('name')} extended to {new_limit} complaints.",
        'user': updated
    })


@app.route('/api/admin/users/<id>/sanction', methods=['PATCH'])
@role_required('admin')
def set_user_sanction(id):
    user = db.find_by_id('users', id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    status = data.get('status')
    warning_note = data.get('warningNote')

    updates = {'status': status}
    if status == 'warned':
        updates['warningCount'] = user.get('warningCount', 0) + 1

    updated = db.update('users', id, updates)
    db.notify(
        user.get('id'),
        user.get('role'),
        f"Account Status Update: {status.upper()}",
        warning_note or f"Your account status has been set to {status} by the administrator.",
        None,
        'warning'
    )

    return jsonify({
        'success': True,
        'message': f"User status set to {status}",
        'user': updated
    })


@app.route('/api/admin/teachers/<id>/approve', methods=['PATCH'])
@role_required('admin')
def approve_teacher(id):
    teacher = db.find_by_id('users', id)
    if not teacher or teacher.get('role') != 'teacher':
        return jsonify({'error': 'Teacher not found'}), 404

    updated = db.update('users', id, {
        'isVerified': True,
        'status': 'active',
        'approvalStatus': 'Approved'
    })
    db.notify(
        teacher.get('id'),
        'teacher',
        'Account Approved',
        'Your teacher account has been approved by the administrator. You can now log in and resolve student complaints.',
        None,
        'approval'
    )

    return jsonify({
        'success': True,
        'message': f"Teacher {teacher.get('name')} approved successfully",
        'teacher': updated,
        'user': updated
    })


@app.route('/api/admin/teachers/<id>/reject', methods=['PATCH'])
@role_required('admin')
def reject_teacher(id):
    teacher = db.find_by_id('users', id)
    if not teacher or teacher.get('role') != 'teacher':
        return jsonify({'error': 'Teacher not found'}), 404

    updated = db.update('users', id, {
        'isVerified': False,
        'status': 'rejected',
        'approvalStatus': 'Not Approved'
    })
    db.notify(
        teacher.get('id'),
        'teacher',
        'Account Not Approved',
        'Your teacher account has been marked as Not Approved by the administrator.',
        None,
        'warning'
    )

    return jsonify({
        'success': True,
        'message': f"Teacher {teacher.get('name')} marked as Not Approved",
        'teacher': updated,
        'user': updated
    })


@app.route('/api/admin/teachers/<id>/status', methods=['PATCH'])
@role_required('admin')
def set_teacher_approval_status(id):
    teacher = db.find_by_id('users', id)
    if not teacher or teacher.get('role') != 'teacher':
        return jsonify({'error': 'Teacher not found'}), 404

    data = request.get_json() or {}
    target = data.get('status') or data.get('approvalStatus')
    if target not in ['Approved', 'Not Approved', 'Waiting for Approval']:
        return jsonify({'error': 'Invalid status. Must be Approved, Not Approved, or Waiting for Approval'}), 400

    if target == 'Approved':
        updates = {'isVerified': True, 'status': 'active', 'approvalStatus': 'Approved'}
        note_title = 'Account Approved'
        note_body = 'Your teacher account has been approved by the administrator. You can now log in and resolve student complaints.'
        note_type = 'approval'
    elif target == 'Not Approved':
        updates = {'isVerified': False, 'status': 'rejected', 'approvalStatus': 'Not Approved'}
        note_title = 'Account Not Approved'
        note_body = 'Your teacher account has been marked as Not Approved by the administrator.'
        note_type = 'warning'
    else:
        updates = {'isVerified': False, 'status': 'active', 'approvalStatus': 'Waiting for Approval'}
        note_title = 'Account Waiting for Approval'
        note_body = 'Your teacher account status has been set to Waiting for Approval by the administrator.'
        note_type = 'update'

    updated = db.update('users', id, updates)
    db.notify(teacher.get('id'), 'teacher', note_title, note_body, None, note_type)

    return jsonify({
        'success': True,
        'message': f"Teacher approval status updated to {target}",
        'teacher': updated,
        'user': updated
    })


@app.route('/api/admin/teachers/<id>/verify', methods=['PATCH'])
@role_required('admin')
def verify_teacher(id):
    teacher = db.find_by_id('users', id)
    if not teacher or teacher.get('role') != 'teacher':
        return jsonify({'error': 'Teacher not found'}), 404

    updated = db.update('users', id, {
        'isVerified': True,
        'status': 'active',
        'approvalStatus': 'Approved'
    })
    db.notify(
        teacher.get('id'),
        'teacher',
        'Account Verified & Approved',
        'Your teacher account has been approved by the administrator. You can now accept complaint assignments.',
        None,
        'approval'
    )

    return jsonify({
        'success': True,
        'message': f"Teacher {teacher.get('name')} verified successfully",
        'teacher': updated
    })


@app.route('/api/admin/reports', methods=['GET'])
@role_required('admin')
def get_reports():
    reports = db.get('reports')
    complaints = db.get('complaints')
    complaints_map = {c.get('id'): c.get('title') for c in complaints}

    enriched = []
    for r in reports:
        r_dict = dict(r)
        r_dict['complaintTitle'] = complaints_map.get(r.get('complaintId'), 'Unknown Complaint')
        enriched.append(r_dict)

    return jsonify({'reports': enriched})


@app.route('/api/admin/reports/<id>/action', methods=['POST'])
@role_required('admin')
def handle_report(id):
    report = db.find_by_id('reports', id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    data = request.get_json() or {}
    action = data.get('action') or 'action_taken'
    note = data.get('note') or 'Reviewed and handled by administrator'
    mark_fake = data.get('markFake')

    updated_report = db.update('reports', id, {
        'status': action,
        'adminAction': note
    })

    if mark_fake and report.get('complaintId'):
        comp = db.find_by_id('complaints', report.get('complaintId'))
        if comp:
            db.update('complaints', comp.get('id'), {
                'status': 'Rejected',
                'rejectionReason': 'Flagged as Fake / Malicious Complaint following review.'
            })
            student = db.find_by_id('users', comp.get('studentUserId'))
            if student:
                warn_count = student.get('warningCount', 0) + 1
                db.update('users', student.get('id'), {
                    'warningCount': warn_count,
                    'status': 'restricted' if warn_count >= 2 else 'warned'
                })
                db.notify(
                    student.get('id'),
                    'student',
                    'PENALTY: Fake Complaint Warning',
                    f"Your complaint {comp.get('id')} was found to be fake/spam. A strike has been added to your record.",
                    comp.get('id'),
                    'warning'
                )

    return jsonify({'success': True, 'report': updated_report})


# --- NOTIFICATIONS ENDPOINTS ---

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    if not g.user:
        return jsonify({'notifications': [], 'unreadCount': 0})

    u_id = g.user.get('id')
    u_role = g.user.get('role')
    notifs = db.find(
        'notifications',
        lambda n: n.get('userId') == u_id or (u_role == 'admin' and n.get('role') == 'admin')
    )
    notifs.sort(key=lambda n: n.get('createdAt', ''), reverse=True)
    unread_count = sum(1 for n in notifs if not n.get('isRead'))

    return jsonify({
        'notifications': notifs,
        'unreadCount': unread_count
    })


@app.route('/api/notifications/<id>/read', methods=['PATCH'])
def mark_notification_read(id):
    updated = db.update('notifications', id, {'isRead': True})
    return jsonify({'success': True, 'notification': updated})


@app.route('/api/notifications/read-all', methods=['POST'])
def mark_all_notifications_read():
    if not g.user:
        return jsonify({'success': True})

    u_id = g.user.get('id')
    u_role = g.user.get('role')
    all_notifs = db.get('notifications')
    for n in all_notifs:
        if n.get('userId') == u_id or (u_role == 'admin' and n.get('role') == 'admin'):
            db.update('notifications', n.get('id'), {'isRead': True})

    return jsonify({'success': True, 'message': 'All notifications marked as read'})


# --- SYSTEM HEALTH & SUPABASE STATUS ---

@app.route('/api/system/status', methods=['GET'])
def system_status():
    from server.supabase_client import get_supabase_config_status
    cfg = get_supabase_config_status()
    return jsonify({
        'status': 'healthy',
        'backend': 'Python Flask',
        'activeDatabase': 'Supabase PostgreSQL' if cfg['configured'] else 'Local JSON Fallback',
        'supabase': {
            'configured': cfg['configured'],
            'url': cfg.get('url'),
            'reason': cfg.get('reason') if not cfg['configured'] else 'Active'
        }
    })


# --- FRONTEND CLIENT SPA SERVING ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    # Guard: Unknown /api/* requests should return 404 JSON, not SPA HTML
    if path.startswith('api/') or path == 'api':
        return jsonify({'error': f"API endpoint '/{path}' not found."}), 404

    if not os.path.exists(CLIENT_DIST):
        return jsonify({
            'message': 'Student Complaint Box Flask REST API is operational.',
            'endpoints': '/api/*',
            'clientNotice': 'Build React client using npm run build --prefix client to serve frontend SPA directly from Flask.'
        })

    target_file = os.path.join(CLIENT_DIST, path)
    if path != '' and os.path.exists(target_file):
        return send_from_directory(CLIENT_DIST, path)
    return send_from_directory(CLIENT_DIST, 'index.html')


# --- ERROR HANDLERS ---

@app.errorhandler(400)
def handle_bad_request(e):
    return jsonify({'error': 'Bad Request', 'message': getattr(e, 'description', str(e))}), 400

@app.errorhandler(404)
def handle_not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': f"Endpoint '{request.path}' not found."}), 404
    return serve_frontend(request.path)

@app.errorhandler(405)
def handle_method_not_allowed(e):
    return jsonify({'error': f"HTTP method '{request.method}' not allowed on '{request.path}'."}), 405

@app.errorhandler(413)
def handle_payload_too_large(e):
    return jsonify({'error': 'Uploaded file exceeds the maximum 10MB limit.'}), 413

@app.errorhandler(500)
def handle_internal_server_error(e):
    return jsonify({'error': 'Internal server error. Please try again later.'}), 500


if __name__ == '__main__':
    from server.supabase_client import get_supabase_config_status
    cfg = get_supabase_config_status()

    print("===========================================================")
    print("      STUDENT COMPLAINT BOX - PYTHON FLASK BACKEND         ")
    print("===========================================================")
    print(f"Server Port:         http://localhost:{PORT}")
    if cfg['configured']:
        print(f"Supabase Status:     CONNECTED ({cfg['url']})")
    else:
        print(f"Supabase Status:     LOCAL FALLBACK ({cfg['reason']})")
    print("===========================================================")

    # Initial SLA Breach check
    try:
        db.check_sla_breaches()
    except Exception as _e:
        pass

    app.run(host='0.0.0.0', port=PORT, debug=True)
