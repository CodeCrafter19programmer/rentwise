-- ============================================
-- CREATE TEST USERS FOR RENTWISE
-- Run this in Supabase SQL Editor
-- ============================================

-- IMPORTANT: First create the users in Supabase Auth Dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Create these users with email/password:
--    - admin@rentwise.com / Admin123!
--    - manager@rentwise.com / Manager123!
--    - tenant@rentwise.com / Tenant123!

-- After creating auth users, get their UUIDs from the dashboard
-- Then run these INSERT statements with the correct UUIDs:

-- Step 1: Check existing profiles
SELECT id, email, role FROM profiles ORDER BY created_at DESC;

-- Step 2: Update existing admin user role (if exists)
-- Replace 'YOUR_ADMIN_UUID' with the actual UUID from auth.users
UPDATE profiles 
SET role = 'admin', name = 'System Admin'
WHERE email = 'admin@test.com' OR email = 'admin@rentwise.com';

-- Step 3: If profile doesn't exist, insert it
-- Get the user ID from auth.users first:
-- SELECT id, email FROM auth.users;

-- Then insert profile with correct role:
-- INSERT INTO profiles (id, email, name, role)
-- VALUES 
--   ('UUID-FROM-AUTH-USERS', 'admin@rentwise.com', 'System Admin', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'System Admin';

-- ============================================
-- QUICK FIX: Update role for existing user
-- ============================================

-- Find your admin user's ID:
SELECT au.id, au.email, p.role 
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Update the role (replace the UUID below with your actual admin user ID):
-- UPDATE profiles SET role = 'admin' WHERE id = '2046729b-13cd-4828-a278-b83ed3622941';

-- If profile doesn't exist, create it:
-- INSERT INTO profiles (id, email, name, role)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 'admin'
-- FROM auth.users
-- WHERE email = 'admin@test.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ============================================
-- VERIFY the get_my_role() function exists
-- ============================================
SELECT get_my_role();

-- If the above fails, the RLS migration wasn't run properly.
-- Run migrations/fix_rls_recursion_v2.sql first.
