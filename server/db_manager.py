"""
Database Layer for Student Complaint Box with Supabase PostgreSQL Integration
Provides unified data access with live Supabase operations and resilient local fallback.
"""
import json
import os
import sys
import copy
import threading
from datetime import datetime, timezone

# Ensure path resolution
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
for path in [ROOT_DIR, CURRENT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from server.supabase_client import (
        get_supabase_client,
        is_supabase_configured,
        get_supabase_config_status,
        to_camel_case,
        to_snake_case,
        COLLECTION_TO_TABLE,
        TABLE_TO_COLLECTION
    )
except ImportError:
    from supabase_client import (
        get_supabase_client,
        is_supabase_configured,
        get_supabase_config_status,
        to_camel_case,
        to_snake_case,
        COLLECTION_TO_TABLE,
        TABLE_TO_COLLECTION
    )

IS_VERCEL = bool(os.environ.get('VERCEL'))
if IS_VERCEL:
    DATA_DIR = '/tmp/data'
else:
    DATA_DIR = os.path.join(CURRENT_DIR, 'data')
DB_FILE = os.path.join(DATA_DIR, 'db.json')

DEFAULT_SEED = {
    "colleges": [
        {
            "id": "5555",
            "name": "Sonopant Dandekar Arts, V. S. Apte Commerce & M. H. Mehta Science College, Palghar",
            "code": "SDACS",
            "status": "active",
            "address": "Kharekuran Road, Mahim Road, Palghar (West), Dist. Palghar, Maharashtra - 401404",
            "contactEmail": "principal@sdacs.ac.in",
            "contactPhone": "+91 2525 252163",
            "principalName": "Dr. Kiran Save",
            "affiliation": "University of Mumbai",
            "registeredFrom": "system_seed",
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "2041",
            "name": "St. John College of Engineering and Management, Palghar",
            "code": "SJCEM",
            "status": "active",
            "address": "Vevoor, Manor Road, Palghar (East), Maharashtra - 401404",
            "contactEmail": "office@sjcem.edu.in",
            "contactPhone": "+91 2525 297275",
            "principalName": "Dr. G. V. Mulgund",
            "affiliation": "University of Mumbai",
            "registeredFrom": "system_seed",
            "createdAt": "2026-01-01T00:00:00.000Z"
        }
    ],
    "users": [
        {
            "id": "USR-00001",
            "role": "admin",
            "name": "Khushil Vijay Thakur (Super Administrator)",
            "mobile": "9876543210",
            "email": "khushilthakur28@gmail.com",
            # bcrypt hash for "557858466179=2131"
            "passwordHash": "$2b$10$KV6Vyk8UFMd9LgqlUZkJ5ud4G9B1bDd/70njiKv7gbNQbCzlu1mca",
            "status": "active",
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "USR-T1001",
            "role": "teacher",
            "name": "Prof. Bhakti Patil",
            "mobile": "9822334455",
            "email": "bhakti.patil@sdacs.ac.in",
            "collegeId": "5555",
            "collegeName": "Sonopant Dandekar Arts, V. S. Apte Commerce & M. H. Mehta Science College, Palghar",
            "teacherId": "5555-T100",
            "department": "Department of Computer Science",
            # bcrypt hash for "Teacher@123"
            "passwordHash": "$2b$10$IwkAugUwwMbmrzu52dcSquUAtK2ejy0.ZRk.c2wYNpMGRUhhzg7Oa",
            "status": "active",
            "isVerified": True,
            "approvalStatus": "Approved",
            "resolvedCount": 1,
            "activeAssignedCount": 1,
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "USR-T1002",
            "role": "teacher",
            "name": "Prof. Sandeep Kadam",
            "mobile": "9822233344",
            "email": "sandeep.kadam@sdacs.ac.in",
            "collegeId": "5555",
            "collegeName": "Sonopant Dandekar Arts, V. S. Apte Commerce & M. H. Mehta Science College, Palghar",
            "teacherId": "5555-T101",
            "department": "Department of Information Technology",
            "passwordHash": "$2b$10$IwkAugUwwMbmrzu52dcSquUAtK2ejy0.ZRk.c2wYNpMGRUhhzg7Oa",
            "status": "active",
            "isVerified": True,
            "approvalStatus": "Approved",
            "resolvedCount": 0,
            "activeAssignedCount": 0,
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "USR-T2001",
            "role": "teacher",
            "name": "Prof. Amit Saxena",
            "mobile": "9833344455",
            "email": "amit.saxena@sjcem.edu.in",
            "collegeId": "2041",
            "collegeName": "St. John College of Engineering and Management, Palghar",
            "teacherId": "2041-T201",
            "department": "Computer Engineering",
            "passwordHash": "$2b$10$IwkAugUwwMbmrzu52dcSquUAtK2ejy0.ZRk.c2wYNpMGRUhhzg7Oa",
            "status": "active",
            "isVerified": True,
            "approvalStatus": "Approved",
            "resolvedCount": 0,
            "activeAssignedCount": 0,
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "USR-S1001",
            "role": "student",
            "name": "Khushil Vijay Thakur",
            "mobile": "9899123456",
            "email": "khushilthakur28@gmail.com",
            "collegeId": "5555",
            "studentId": "5555-S01",
            "maskedName": "Student #A782",
            "complaintLimit": 10,
            "complaintsSubmitted": 2,
            "status": "active",
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        },
        {
            "id": "USR-S2001",
            "role": "student",
            "name": "Pratiksha Patil",
            "mobile": "9899345678",
            "email": "pratiksha.patil@sjcem.edu.in",
            "collegeId": "2041",
            "studentId": "2041-S01",
            "maskedName": "Student #C419",
            "complaintLimit": 10,
            "complaintsSubmitted": 1,
            "status": "active",
            "warningCount": 0,
            "createdAt": "2026-01-01T00:00:00.000Z"
        }
    ],
    "complaints": [
        {
            "id": "CMP-5555-001",
            "title": "Computer Science Lab 3 High-Performance Desktops Power Surge during Practicals",
            "description": "During final year practical sessions in CS Lab 3, terminals on bench rows 2 and 3 face intermittent voltage tripping from the secondary inverter line. Needs electrician inspection and stabilizer reset.",
            "category": "Infrastructure",
            "priority": "Medium",
            "status": "In Progress",
            "collegeId": "5555",
            "studentUserId": "USR-S1001",
            "studentName": "Khushil Vijay Thakur",
            "studentMobile": "9899123456",
            "studentAnonymousId": "Student #A782",
            "maskedName": "Student #A782",
            "assignedTeacherId": "USR-T1001",
            "assignedTeacherName": "Prof. Bhakti Patil",
            "assignedTeacherRefId": "5555-T100",
            "assignedAt": "2026-03-01T10:00:00.000Z",
            "slaHours": 72,
            "deadlineAt": "2026-03-04T10:00:00.000Z",
            "visibility": "Public",
            "proofs": [],
            "verification": {"status": "Pending"},
            "createdAt": "2026-03-01T08:00:00.000Z",
            "updatedAt": "2026-03-01T10:00:00.000Z"
        },
        {
            "id": "CMP-5555-002",
            "title": "Digital Reference Section Wi-Fi Speed & Access in Central Library",
            "description": "The rear bench in Hall 3B has loose fittings and the electrical plug socket for laptop presentations trips the breaker.",
            "category": "Maintenance",
            "priority": "High",
            "status": "Completed",
            "collegeId": "5555",
            "studentUserId": "USR-S1001",
            "studentName": "Khushil Vijay Thakur",
            "studentMobile": "9899123456",
            "studentAnonymousId": "Student #A782",
            "maskedName": "Student #A782",
            "assignedTeacherId": "USR-T1001",
            "assignedTeacherName": "Prof. Bhakti Patil",
            "assignedTeacherRefId": "5555-T100",
            "assignedAt": "2026-02-15T09:00:00.000Z",
            "slaHours": 48,
            "deadlineAt": "2026-02-17T09:00:00.000Z",
            "resolvedAt": "2026-02-16T14:00:00.000Z",
            "completedAt": "2026-02-16T18:00:00.000Z",
            "resolutionProof": {
                "text": "Maintenance team replaced the damaged socket and secured bench frame with new anchors. Verified working.",
                "resolvedBy": "Prof. Bhakti Patil",
                "resolvedAt": "2026-02-16T14:00:00.000Z"
            },
            "verification": {
                "status": "Done",
                "verifiedBy": "Student",
                "verifiedAt": "2026-02-16T18:00:00.000Z",
                "feedback": "Fixed properly, thank you!"
            },
            "visibility": "Public",
            "createdAt": "2026-02-15T08:00:00.000Z",
            "updatedAt": "2026-02-16T18:00:00.000Z"
        },
        {
            "id": "CMP-2041-001",
            "title": "Digital Library Access Passwords Expired for 3rd Year Batch",
            "description": "The IEEE and ACM portal credentials issued during orientation have expired prematurely for the 2024-2027 mechanical batch.",
            "category": "Academics",
            "priority": "Medium",
            "status": "Pending",
            "collegeId": "2041",
            "studentUserId": "USR-S2001",
            "studentName": "Pratiksha Patil",
            "studentMobile": "9899345678",
            "studentAnonymousId": "Student #C419",
            "maskedName": "Student #C419",
            "assignedTeacherId": None,
            "assignedTeacherName": None,
            "visibility": "Public",
            "proofs": [],
            "verification": {"status": "Pending"},
            "createdAt": "2026-03-02T11:00:00.000Z",
            "updatedAt": "2026-03-02T11:00:00.000Z"
        }
    ],
    "activityLogs": [
        {
            "id": "ACT-001",
            "complaintId": "CMP-5555-001",
            "action": "SUBMITTED",
            "actorRole": "student",
            "actorName": "Student #A782",
            "details": "Complaint submitted for Sonopant Dandekar College, Palghar (5555)",
            "timestamp": "2026-03-01T08:00:00.000Z"
        },
        {
            "id": "ACT-002",
            "complaintId": "CMP-5555-001",
            "action": "ASSIGNED",
            "actorRole": "admin",
            "actorName": "Khushil Vijay Thakur (Super Administrator)",
            "details": "Assigned to Prof. Bhakti Patil with 72h SLA",
            "timestamp": "2026-03-01T10:00:00.000Z"
        }
    ],
    "comments": [],
    "reports": [],
    "notifications": []
}


class DatabaseManager:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._data = None
        self._init_storage()

    def _init_storage(self):
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        except Exception:
            pass
        with self.lock:
            if os.path.exists(self.db_path):
                try:
                    with open(self.db_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content:
                            self._data = json.loads(content)
                            if 'activityLogs' not in self._data:
                                self._data['activityLogs'] = self._data.get('activities', [])
                except Exception as e:
                    print(f"[DB] Error reading existing {self.db_path}: {e}")

            if not self._data:
                self._data = copy.deepcopy(DEFAULT_SEED)
                self._save_unlocked()

        # If Supabase is configured, hydrate from Supabase PostgreSQL
        if is_supabase_configured():
            self.sync_from_supabase()

    def _save_unlocked(self):
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[DB] Error writing to {self.db_path}: {e}")

    def sync_from_supabase(self):
        """
        Hydrate in-memory state and local fallback from live Supabase PostgreSQL.
        If tables in Supabase are empty, seed with initial dataset.
        """
        if not is_supabase_configured():
            return False

        client = get_supabase_client()
        if not client:
            return False

        try:
            print("[SUPABASE] Hydrating application state from Supabase PostgreSQL...")
            synced = {}
            for col_name, table_name in COLLECTION_TO_TABLE.items():
                try:
                    res = client.table(table_name).select('*').execute()
                    rows = res.data or []
                    synced[col_name] = [to_camel_case(r) for r in rows]
                except Exception as table_err:
                    print(f"[SUPABASE] Warning: could not query {table_name}: {table_err}")
                    return False

            with self.lock:
                for col_name, items in synced.items():
                    self._data[col_name] = items

                # If users table is empty in Supabase, seed default admin & seed users
                if len(self._data.get('users', [])) == 0:
                    print("[SUPABASE] Seeding initial Super Administrator and demo accounts to Supabase...")
                    for u in DEFAULT_SEED.get('users', []):
                        try:
                            client.table('users').upsert(to_snake_case(u)).execute()
                        except Exception as ue:
                            print(f"[SUPABASE] Seed user error: {ue}")
                    for col in DEFAULT_SEED.get('colleges', []):
                        try:
                            client.table('colleges').upsert(to_snake_case(col)).execute()
                        except Exception as ce:
                            print(f"[SUPABASE] Seed college error: {ce}")
                    self._data = copy.deepcopy(DEFAULT_SEED)

                self._save_unlocked()

            print(f"[SUPABASE] Synchronized successfully: {len(self._data.get('colleges', []))} colleges, {len(self._data.get('users', []))} users, {len(self._data.get('complaints', []))} complaints.")
            return True
        except Exception as err:
            print(f"[SUPABASE] Sync error: {err}")
            return False

    def reset(self):
        """Reset the local state to initial seed state."""
        with self.lock:
            self._data = copy.deepcopy(DEFAULT_SEED)
            self._save_unlocked()

        if is_supabase_configured():
            client = get_supabase_client()
            if client:
                try:
                    # Clean up automated test data in Supabase if present
                    client.table('complaints').delete().eq('college_id', '5001').execute()
                    client.table('complaints').delete().ilike('title', '%Library Cooling System%').execute()
                    client.table('colleges').delete().eq('id', '5001').execute()
                    client.table('users').update({'complaints_submitted': 2}).eq('id', 'USR-S1001').execute()
                    for m in ['9844455566', '9811998877', '9899001122', '9877112233', '9877445566', '9855555555', '9811990099']:
                        client.table('users').delete().eq('mobile', m).execute()
                    client.table('users').delete().eq('teacher_id', 'EMP-FAC-991').execute()
                except Exception as e:
                    pass

    def get(self, collection):
        """
        Retrieve all items in a collection from Supabase PostgreSQL (or local fallback).
        """
        if is_supabase_configured():
            client = get_supabase_client()
            table = COLLECTION_TO_TABLE.get(collection)
            if client and table:
                try:
                    res = client.table(table).select('*').execute()
                    rows = [to_camel_case(r) for r in (res.data or [])]
                    if collection == 'users':
                        for u in rows:
                            if u.get('role') == 'teacher':
                                if not u.get('approvalStatus'):
                                    if u.get('isVerified') is True:
                                        u['approvalStatus'] = 'Approved'
                                    elif str(u.get('status', '')).lower() in ['rejected', 'unapproved', 'not approved', 'blocked']:
                                        u['approvalStatus'] = 'Not Approved'
                                    else:
                                        u['approvalStatus'] = 'Waiting for Approval'
                                u['accountStatus'] = u['approvalStatus']
                    with self.lock:
                        self._data[collection] = rows
                    return copy.deepcopy(rows)
                except Exception as err:
                    print(f"[SUPABASE] Error reading {table}: {err}. Falling back to cache.")

        with self.lock:
            items = self._data.get(collection, [])
            if collection == 'users':
                for u in items:
                    if u.get('role') == 'teacher':
                        if not u.get('approvalStatus'):
                            if u.get('isVerified') is True:
                                u['approvalStatus'] = 'Approved'
                            elif str(u.get('status', '')).lower() in ['rejected', 'unapproved', 'not approved', 'blocked']:
                                u['approvalStatus'] = 'Not Approved'
                            else:
                                u['approvalStatus'] = 'Waiting for Approval'
                        u['accountStatus'] = u['approvalStatus']
            return copy.deepcopy(items)

    def find(self, collection, predicate):
        items = self.get(collection)
        return [dict(x) for x in items if predicate(x)]

    def find_one(self, collection, predicate):
        items = self.get(collection)
        for x in items:
            if predicate(x):
                return dict(x)
        return None

    def find_by_id(self, collection, item_id):
        if is_supabase_configured():
            client = get_supabase_client()
            table = COLLECTION_TO_TABLE.get(collection)
            if client and table:
                try:
                    res = client.table(table).select('*').eq('id', str(item_id)).limit(1).execute()
                    if res.data:
                        item = to_camel_case(res.data[0])
                        if collection == 'users' and item.get('role') == 'teacher':
                            if not item.get('approvalStatus'):
                                if item.get('isVerified') is True:
                                    item['approvalStatus'] = 'Approved'
                                elif str(item.get('status', '')).lower() in ['rejected', 'unapproved', 'not approved', 'blocked']:
                                    item['approvalStatus'] = 'Not Approved'
                                else:
                                    item['approvalStatus'] = 'Waiting for Approval'
                            item['accountStatus'] = item['approvalStatus']
                        return item
                except Exception as err:
                    print(f"[SUPABASE] Error find_by_id on {table} for {item_id}: {err}")

        items = self.get(collection)
        for x in items:
            if str(x.get('id')) == str(item_id):
                return dict(x)
        return None

    def insert(self, collection, item):
        new_item = copy.deepcopy(dict(item))
        with self.lock:
            if collection not in self._data:
                self._data[collection] = []
            self._data[collection].insert(0, new_item)
            self._save_unlocked()

        if is_supabase_configured():
            client = get_supabase_client()
            table = COLLECTION_TO_TABLE.get(collection)
            if client and table:
                try:
                    snake_item = to_snake_case(new_item)
                    if collection == 'users':
                        snake_item.pop('approval_status', None)
                        snake_item.pop('designation', None)
                    elif collection == 'comments':
                        snake_item.pop('user_id', None)
                    elif collection == 'reports':
                        snake_item.pop('reported_by_name', None)
                        snake_item.pop('reported_by_user_id', None)
                    elif collection == 'complaints':
                        # Ensure student user exists in Supabase users table to avoid foreign key violation
                        student_uid = new_item.get('studentUserId')
                        if student_uid:
                            user_check = client.table('users').select('id').eq('id', str(student_uid)).limit(1).execute()
                            if not user_check.data:
                                student_obj = self.find_by_id('users', student_uid)
                                if student_obj:
                                    try:
                                        snake_student = to_snake_case(student_obj)
                                        snake_student.pop('approval_status', None)
                                        client.table('users').upsert(snake_student).execute()
                                    except Exception as ue:
                                        print(f"[SUPABASE] Warning syncing student user for complaint: {ue}")

                    client.table(table).upsert(snake_item).execute()
                except Exception as err:
                    print(f"[SUPABASE] Error syncing insert to {table}: {err}")
                    # Roll back local cache so memory does not diverge from database
                    with self.lock:
                        if collection in self._data:
                            self._data[collection] = [x for x in self._data[collection] if str(x.get('id')) != str(new_item.get('id'))]
                            self._save_unlocked()
                    raise RuntimeError(f"Database error while saving {collection}: {err}")

        return copy.deepcopy(new_item)

    def update(self, collection, item_id, updates):
        if collection == 'users' and 'approvalStatus' in updates:
            app_st = updates['approvalStatus']
            if app_st == 'Approved':
                updates.setdefault('isVerified', True)
                updates.setdefault('status', 'active')
            elif app_st == 'Not Approved':
                updates.setdefault('isVerified', False)
                updates.setdefault('status', 'rejected')
            elif app_st == 'Waiting for Approval':
                updates.setdefault('isVerified', False)
                updates.setdefault('status', 'active')

        updated_item = None
        with self.lock:
            items = self._data.get(collection, [])
            for i, x in enumerate(items):
                if str(x.get('id')) == str(item_id):
                    x.update(updates)
                    x['updatedAt'] = datetime.now(timezone.utc).isoformat()
                    self._data[collection][i] = x
                    updated_item = copy.deepcopy(x)
                    self._save_unlocked()
                    break

        if is_supabase_configured():
            client = get_supabase_client()
            table = COLLECTION_TO_TABLE.get(collection)
            if client and table:
                try:
                    snake_updates = to_snake_case(updates)
                    if collection == 'users':
                        snake_updates.pop('approval_status', None)
                        snake_updates.pop('designation', None)
                    if collection != 'notifications':
                        snake_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                    client.table(table).update(snake_updates).eq('id', str(item_id)).execute()
                except Exception as err:
                    print(f"[SUPABASE] Error syncing update to {table} for {item_id}: {err}")

        return updated_item

    def delete(self, collection, item_id):
        deleted = False
        with self.lock:
            items = self._data.get(collection, [])
            original_len = len(items)
            self._data[collection] = [x for x in items if str(x.get('id')) != str(item_id)]
            if len(self._data[collection]) != original_len:
                deleted = True
                self._save_unlocked()

        if is_supabase_configured() and deleted:
            client = get_supabase_client()
            table = COLLECTION_TO_TABLE.get(collection)
            if client and table:
                try:
                    client.table(table).delete().eq('id', str(item_id)).execute()
                except Exception as err:
                    print(f"[SUPABASE] Error syncing delete to {table} for {item_id}: {err}")

        return deleted

    def log_activity(self, complaint_id, action, actor_role, actor_name, details):
        now_iso = datetime.now(timezone.utc).isoformat()
        act = {
            "id": f"ACT-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "complaintId": complaint_id,
            "action": action,
            "actorRole": actor_role,
            "actorName": actor_name,
            "details": details,
            "timestamp": now_iso
        }
        return self.insert("activityLogs", act)

    def notify(self, user_id, role, title, message, complaint_id=None, notif_type="status"):
        now_iso = datetime.now(timezone.utc).isoformat()
        notif = {
            "id": f"notif-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "userId": user_id,
            "role": role,
            "title": title,
            "message": message,
            "complaintId": complaint_id,
            "type": notif_type,
            "isRead": False,
            "createdAt": now_iso
        }
        return self.insert("notifications", notif)

    def check_sla_breaches(self):
        """Auto-escalate active complaints that breached SLA deadlines."""
        now = datetime.now(timezone.utc)
        complaints = self.get("complaints")
        for cmp in complaints:
            if cmp.get('status') in ['Assigned', 'In Progress'] and cmp.get('deadlineAt') and not cmp.get('isEscalated'):
                try:
                    # Parse deadline ISO
                    deadline_str = cmp.get('deadlineAt').replace('Z', '+00:00')
                    deadline = datetime.fromisoformat(deadline_str)
                    if now > deadline:
                        now_iso = now.isoformat()
                        self.update('complaints', cmp.get('id'), {
                            'isEscalated': True,
                            'escalatedAt': now_iso,
                            'escalationReason': f"Resolution timer exceeded SLA ({cmp.get('slaHours')}h)",
                            'escalatedTo': "Principal & College Grievance Cell"
                        })
                        self.log_activity(
                            cmp.get('id'),
                            "ESCALATED",
                            "system",
                            "System SLA Monitor",
                            f"Timer exceeded {cmp.get('slaHours')}h threshold without resolution. Auto-escalated to College Principal."
                        )
                        self.notify(
                            "USR-00001",
                            "admin",
                            "Automatic Escalation Triggered",
                            f"Complaint {cmp.get('id')} ({cmp.get('title', '')[:30]}...) breached SLA and has been escalated.",
                            cmp.get('id'),
                            "escalation"
                        )
                except Exception as e:
                    print(f"[SLA] Error checking SLA for {cmp.get('id')}: {e}")


# Singleton instance
db = DatabaseManager()
