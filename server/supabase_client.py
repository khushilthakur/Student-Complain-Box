"""
Supabase PostgreSQL Client and Environment Management for Python Flask Backend
Provides authenticated connection, diagnostic testing, and schema mapping.
"""
import os
import re
import sys
from dotenv import load_dotenv

# Canonical environment loading
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
SERVER_ENV = os.path.join(CURRENT_DIR, '.env')
ROOT_ENV = os.path.join(ROOT_DIR, '.env')

# Default institutional Supabase project URL
FALLBACK_SUPABASE_URL = "https://zlasakmbkpprcswtjzbi.supabase.co"

def load_environment():
    """Load environment variables from server/.env or root .env."""
    env_file = SERVER_ENV if os.path.exists(SERVER_ENV) else (ROOT_ENV if os.path.exists(ROOT_ENV) else None)
    if env_file:
        load_dotenv(env_file, override=False)
        # Parse manually for unassigned raw secret key edge case
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                content = f.read()
            for line in content.splitlines():
                trimmed = line.strip()
                if (trimmed.startswith('sb_secret_') or trimmed.startswith('eyJ')) and '=' not in trimmed:
                    if not os.environ.get('SUPABASE_SECRET_KEY') and not os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
                        os.environ['SUPABASE_SECRET_KEY'] = trimmed
                        break
        except Exception:
            pass

    # Normalize aliases across URL variants
    active_url = (
        os.environ.get('SUPABASE_URL') or
        os.environ.get('VITE_SUPABASE_URL') or
        os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or
        os.environ.get('REACT_APP_SUPABASE_URL') or
        FALLBACK_SUPABASE_URL
    )
    if active_url:
        os.environ['SUPABASE_URL'] = active_url.strip().strip('"\'')

    # Normalize aliases across key variants
    active_key = (
        os.environ.get('SUPABASE_SECRET_KEY') or
        os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
        os.environ.get('SUPABASE_KEY') or
        os.environ.get('SUPABASE_SERVICE_KEY') or
        os.environ.get('VITE_SUPABASE_ANON_KEY') or
        os.environ.get('VITE_SUPABASE_KEY')
    )
    if active_key:
        os.environ['SUPABASE_SECRET_KEY'] = active_key.strip().strip('"\'')
        os.environ['SUPABASE_SERVICE_ROLE_KEY'] = active_key.strip().strip('"\'')

    return env_file

# Load on module import
load_environment()

# Table name mappings: internal collection -> Supabase PostgreSQL table
COLLECTION_TO_TABLE = {
    'colleges': 'colleges',
    'users': 'users',
    'complaints': 'complaints',
    'activityLogs': 'activity_logs',
    'comments': 'comments',
    'reports': 'reports',
    'notifications': 'notifications'
}

TABLE_TO_COLLECTION = {
    'colleges': 'colleges',
    'users': 'users',
    'complaints': 'complaints',
    'activity_logs': 'activityLogs',
    'comments': 'comments',
    'reports': 'reports',
    'notifications': 'notifications'
}


def get_supabase_config_status():
    """
    Returns configuration status without exposing secret values.
    """
    raw_url = (
        os.environ.get('SUPABASE_URL', '') or
        os.environ.get('VITE_SUPABASE_URL', '') or
        os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '') or
        FALLBACK_SUPABASE_URL
    )
    raw_key = (
        os.environ.get('SUPABASE_SECRET_KEY', '') or
        os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '') or
        os.environ.get('SUPABASE_KEY', '') or
        FALLBACK_SUPABASE_KEY
    )

    url = raw_url.strip().strip('"\'')
    key = raw_key.strip().strip('"\'')

    if not url:
        return {'configured': False, 'reason': 'SUPABASE_URL is not set in server/.env'}
    if not key:
        return {'configured': False, 'reason': 'SUPABASE_SECRET_KEY is not set in server/.env'}
    if not (url.startswith('https://') or url.startswith('http://')):
        return {'configured': False, 'reason': 'SUPABASE_URL must begin with https://'}
    if any(placeholder in url for placeholder in ['your-project', 'your-project-ref', 'your-project-id', 'xxxx.supabase.co']):
        return {'configured': False, 'reason': 'SUPABASE_URL contains a placeholder domain'}

    placeholders = [
        'your-service-role-key',
        'your_new_secret_key',
        'your-supabase-service-role-secret-key-here',
        'your-supabase-anon-public-key-here',
        'PASTE_YOUR_',
        'eyJh......',
        'sb_secret_......'
    ]
    if any(p in key for p in placeholders) or len(key) < 20:
        return {'configured': False, 'reason': 'SUPABASE_SECRET_KEY is still a placeholder value in server/.env'}

    key_type = 'Secret API Key'
    if key.startswith('sb_secret_'):
        key_type = 'Secret API Key (sb_secret_...)'
    elif key.startswith('sb_publishable_'):
        key_type = 'Publishable API Key (sb_publishable_...)'
    elif key.startswith('eyJ'):
        key_type = 'Legacy service_role (JWT)'

    return {
        'configured': True,
        'url': url,
        'keyType': key_type
    }


def is_supabase_configured():
    """Returns True if valid Supabase configuration is present."""
    return get_supabase_config_status()['configured']


_supabase_instance = None
_last_init_url = None
_last_init_key = None

def get_supabase_client():
    """
    Obtains or lazily initializes the Supabase client instance.
    """
    global _supabase_instance, _last_init_url, _last_init_key
    if not is_supabase_configured():
        return None

    url = os.environ.get('SUPABASE_URL', '').strip().strip('"\'')
    key = (os.environ.get('SUPABASE_SECRET_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')).strip().strip('"\'')

    if _supabase_instance and _last_init_url == url and _last_init_key == key:
        return _supabase_instance

    try:
        from supabase import create_client, Client
        _supabase_instance = create_client(url, key)
        _last_init_url = url
        _last_init_key = key
        return _supabase_instance
    except Exception as err:
        print(f"[SUPABASE] Client initialization error: {err}", file=sys.stderr)
        _supabase_instance = None
        return None


def snake_to_camel_str(s):
    """Convert snake_case string to camelCase."""
    components = s.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def camel_to_snake_str(s):
    """Convert camelCase string to snake_case."""
    return re.sub(r'(?<!^)(?=[A-Z])', '_', s).lower()


def to_camel_case(item):
    """Recursively convert dictionary keys to camelCase."""
    if item is None or not isinstance(item, (dict, list)):
        return item
    if isinstance(item, list):
        return [to_camel_case(x) for x in item]
    result = {}
    for k, v in item.items():
        camel_k = snake_to_camel_str(k)
        if k in ('data', 'resolution_proof', 'verification', 'proofs') and isinstance(v, (dict, list)):
            result[camel_k] = v
        else:
            result[camel_k] = to_camel_case(v)
    return result


def to_snake_case(item):
    """Recursively convert dictionary keys to snake_case."""
    if item is None or not isinstance(item, (dict, list)):
        return item
    if isinstance(item, list):
        return [to_snake_case(x) for x in item]
    result = {}
    for k, v in item.items():
        snake_k = camel_to_snake_str(k)
        if k in ('data', 'resolutionProof', 'verification', 'proofs') and isinstance(v, (dict, list)):
            result[snake_k] = v
        else:
            result[snake_k] = to_snake_case(v)
    return result


def test_supabase_connection():
    """
    Tests live connectivity with Supabase PostgreSQL without exposing secrets.
    """
    status = get_supabase_config_status()
    if not status['configured']:
        return {
            'success': False,
            'authenticated': False,
            'schemaPending': False,
            'message': status['reason']
        }

    client = get_supabase_client()
    if not client:
        return {
            'success': False,
            'authenticated': False,
            'schemaPending': False,
            'message': 'Failed to instantiate Supabase client.'
        }

    try:
        res = client.table('colleges').select('id').limit(1).execute()
        return {
            'success': True,
            'authenticated': True,
            'schemaPending': False,
            'message': 'Successfully connected and verified Supabase PostgreSQL database.'
        }
    except Exception as err:
        err_msg = str(err)
        err_lower = err_msg.lower()
        if '42p01' in err_lower or 'does not exist' in err_lower or 'relation' in err_lower:
            return {
                'success': True,
                'authenticated': True,
                'schemaPending': True,
                'message': 'Authenticated successfully with Supabase! (Database tables need to be created via server/supabase_schema.sql)'
            }
        return {
            'success': False,
            'authenticated': False,
            'schemaPending': False,
            'message': err_msg
        }
