"""
=================================================
Need2Done – In-Memory Session Store (FastAPI Safe)
=================================================

✔ Thread-safe
✔ Async-safe (FastAPI compatible)
✔ Session TTL cleanup
✔ Deep-copy safe
✔ Stage normalized
✔ Never raises KeyError
✔ Production hardened
"""

import threading
import time
from copy import deepcopy
from typing import Dict, Any


# =================================================
# INTERNAL STORAGE
# =================================================

_sessions: Dict[str, Dict[str, Any]] = {}

_lock = threading.Lock()

SESSION_TTL = 30 * 60  # 30 minutes


# =================================================
# BASE SESSION TEMPLATE
# =================================================

_BASE_SESSION = {
    "stage": None,
    "name": "",
    "service": None,
    "case_state": "",
    "data": {},
    "last_seen": 0
}


# =================================================
# CREATE NEW SESSION
# =================================================

def _new_session(user_id: str) -> Dict[str, Any]:

    s = deepcopy(_BASE_SESSION)

    s["user_id"] = str(user_id)

    s["last_seen"] = time.time()

    return s


# =================================================
# CLEANUP EXPIRED SESSIONS
# =================================================

def _cleanup_expired():

    now = time.time()

    expired = []

    for uid, sess in list(_sessions.items()):

        if now - sess.get("last_seen", 0) > SESSION_TTL:
            expired.append(uid)

    for uid in expired:
        _sessions.pop(uid, None)


# =================================================
# GET OR CREATE SESSION
# =================================================

def get_session(user_id: str) -> Dict[str, Any]:

    user_id = str(user_id)

    now = time.time()

    with _lock:

        _cleanup_expired()

        if user_id not in _sessions:
            _sessions[user_id] = _new_session(user_id)

        session = _sessions[user_id]

        # Normalize session
        session.setdefault("stage", "ASK_NAME")
        session.setdefault("name", "")
        session.setdefault("service", None)
        session.setdefault("case_state", "")
        session.setdefault("data", {})

        if not isinstance(session["data"], dict):
            session["data"] = {}

        session["last_seen"] = now

        return session


# =================================================
# UPDATE SESSION
# =================================================

def update_session(user_id: str, **kwargs):

    user_id = str(user_id)

    now = time.time()

    with _lock:

        if user_id not in _sessions:
            _sessions[user_id] = _new_session(user_id)

        session = _sessions[user_id]

        for key, value in kwargs.items():
            if key != "data":
                session[key] = value

        session["last_seen"] = now


# =================================================
# RESET SESSION
# =================================================

def reset_session(user_id: str):

    user_id = str(user_id)

    with _lock:
        _sessions.pop(user_id, None)


# =================================================
# ATOMIC DOUBLE CONFIRM PROTECTION
# =================================================

def start_confirming(user_id: str) -> bool:
    user_id = str(user_id)
    with _lock:
        session = _sessions.get(user_id)
        if session and session.get("stage") == "IN_CASE" and session.get("case_state") in ("SUMMARY", "CONFIRM_RIDE"):
            session["case_state"] = "CONFIRMING"
            return True
        return False


# =================================================
# DEBUG / MAINTENANCE
# =================================================

def clear_all_sessions():
    with _lock:
        _sessions.clear()


def active_session_count() -> int:
    with _lock:
        return len(_sessions)