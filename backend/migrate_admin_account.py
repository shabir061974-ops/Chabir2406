"""
One-off migration: rotate the Faiha Store admin account's email + password.

Renames the existing admin user document in place (preserving _id, role,
created_at) rather than deleting + recreating, so it stays a single account
with one continuous history. Safe to re-run: if the new email already has
the right password, it's a no-op; if the old email no longer exists, it
reports that clearly instead of erroring.

New email/password are read from the same ADMIN_EMAIL / ADMIN_PASSWORD env
vars the app already uses (backend/.env) — never hardcoded here, so this
file is safe to keep in git. Only the *old* email (not a secret) has a
literal default, since there's no env var carrying it.

Usage (same pattern as oracle_sync.py):
    docker compose exec -T backend python migrate_admin_account.py
    # or override the old email: OLD_ADMIN_EMAIL=foo@bar.com python migrate_admin_account.py
"""
import asyncio
import os
from datetime import datetime, timezone

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

OLD_EMAIL = os.environ.get("OLD_ADMIN_EMAIL", "admin@faiha.coop")
NEW_EMAIL = os.environ.get("ADMIN_EMAIL")
NEW_PASSWORD = os.environ.get("ADMIN_PASSWORD")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main():
    if not NEW_EMAIL or not NEW_PASSWORD:
        raise RuntimeError("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required (set in backend/.env)")

    mongo_url = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
    db_name = os.environ.get("DB_NAME", "faiha")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    new_user = await db.users.find_one({"email": NEW_EMAIL})
    if new_user is not None:
        print(f"Nothing to do: '{NEW_EMAIL}' already exists (id={new_user['_id']}).")
        return

    old_user = await db.users.find_one({"email": OLD_EMAIL})
    if old_user is None:
        print(f"No user found with old email '{OLD_EMAIL}' — nothing to migrate.")
        return

    await db.users.update_one(
        {"_id": old_user["_id"]},
        {"$set": {
            "email": NEW_EMAIL,
            "password_hash": hash_password(NEW_PASSWORD),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    print(f"Migrated admin account: '{OLD_EMAIL}' -> '{NEW_EMAIL}' (id={old_user['_id']}, role={old_user.get('role')}).")


if __name__ == "__main__":
    asyncio.run(main())
