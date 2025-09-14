# Emergency Database Fix Instructions

## Issue
You're experiencing the `infinite recursion detected in policy for relation "admin_users"` error, which is preventing the application from loading content.

## Quick Fix Steps

### 1. Apply the Emergency Fix for the Recursion

Run the following SQL migration to fix the infinite recursion issue:

```bash
npx supabase db push --db-url=YOUR_SUPABASE_URL --migration-file=20250914000012_quick_fix_admin_recursion.sql
```

This migration:
- Drops all policies on the admin_users table that might be causing recursion
- Creates simple, non-recursive policies that allow basic operations

### 2. Fix Public Content Access

Run the public content access fix:

```bash
npx supabase db push --db-url=YOUR_SUPABASE_URL --migration-file=20250914000013_fix_public_content_access.sql
```

This migration:
- Creates direct access policies for challenges, labs, and leaderboard tables
- Ensures these tables can be accessed without depending on admin_users policies

### 3. Deploy the Updated useAdmin Hook

The `useAdmin.ts` hook has been updated to:
- Directly check for the admin email (shaikhminhaz1975@gmail.com)
- Handle database errors safely without granting admin access

## What This Fix Does

This emergency fix addresses the immediate problem by:
1. Breaking the recursive policy loop in the database
2. Making public content (challenges, labs, leaderboard) directly accessible
3. Ensuring only the specified email has admin access

## Testing After Fix

After applying these changes:
1. Regular users should be able to see challenges, labs, and leaderboard
2. Only shaikhminhaz1975@gmail.com should see admin features
3. The 500 Internal Server errors should be resolved

## Need Additional Help?

If you still encounter issues after applying these fixes, please provide:
1. The specific error messages you're seeing
2. Screenshots of any console errors
3. Which pages are still not loading correctly
