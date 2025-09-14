# All Users as Admins - Restore Original Behavior

## What Changed

Per request, we have reverted to the original behavior where all users are treated as admins. This was done via two changes:

1. **Database Policy Change** (in `20250914000010_restore_all_users_as_admins.sql`):
   - Created policies that allow all authenticated users to access admin functionality
   - Re-enabled the trigger that automatically adds all new users as admins
   - Added all existing users to the admin_users table

2. **Updated useAdmin Hook**:
   - Modified to default to treating users as admins when there's an error
   - This ensures all users have admin access even if there are policy issues

## How to Apply

Run the migration script:

```bash
npx supabase db push --db-url=YOUR_DB_URL --migration-file=20250914000010_restore_all_users_as_admins.sql
```

The updated `useAdmin.ts` hook should be included in your next build/deployment.

## Notes

- This configuration gives all users admin access, which should be used with caution in production
- No data should be lost by applying this migration
- The recursive policy issue is fixed by making the policies simple (always return true)
- This is a temporary solution until proper admin roles can be implemented
