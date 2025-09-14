# Admin Permissions Fix

## Issue

The application was experiencing the following errors:

1. `infinite recursion detected in policy for relation "admin_users"` (PostgreSQL error code 42P17)
2. Multiple 500 Internal Server Errors when trying to fetch data from various tables

## Root Cause

The problem was in the row-level security (RLS) policies for the `admin_users` table. The policies were creating a circular reference:

1. To check if a user could view/modify the `admin_users` table, the policy checked if the user existed in the `admin_users` table.
2. This created an infinite recursion because the database needed to check the `admin_users` table to determine if the user had permission to check the `admin_users` table.

## Solution

The solution was implemented in two parts:

1. **Break the recursion loop** (in `20250914000008_fix_admin_policy_recursion.sql`):
   - Created a new `bootstrap_admins` table that holds the initial admin(s)
   - Modified policies to check `bootstrap_admins` instead of `admin_users` to avoid circular references
   - This creates a one-way dependency: `bootstrap_admins` → `admin_users` (no circular references)

2. **Fix row-level security on other tables** (in `20250914000009_fix_table_permissions.sql`):
   - Added explicit policies for common tables like `challenges`, `labs`, and `leaderboard_entries`
   - Ensured that viewing these tables doesn't require an admin check

3. **Updated the `useAdmin` hook**:
   - Modified to check both `bootstrap_admins` and `admin_users` tables
   - Added better error handling to prevent crashes when tables are inaccessible

## How to Apply the Fix

Run the migrations in order:

```bash
# Fix the recursive policies
npx supabase db push --db-url=YOUR_DB_URL --migration-file=20250914000008_fix_admin_policy_recursion.sql

# Fix the table permissions
npx supabase db push --db-url=YOUR_DB_URL --migration-file=20250914000009_fix_table_permissions.sql
```

## Testing

After applying the fixes, you should be able to:
1. Access the dashboard without seeing 500 errors
2. View challenges, labs, and leaderboard entries
3. Login as an admin and manage admin users

If issues persist, check the browser console for specific error messages.
