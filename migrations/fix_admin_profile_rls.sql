-- ============================================
-- FIX ADMIN PROFILE RLS POLICY
-- Run this in Supabase SQL Editor
-- ============================================
-- 
-- ROOT CAUSE: Admin RLS policy allows reading ALL profiles.
-- When frontend calls .eq('id', auth.uid()).single(), the RLS
-- returns multiple rows for admins, causing 406/500 errors.
-- The role then defaults to 'tenant'.
--
-- FIX: Admin policy should exclude own profile (let self-read handle it)
-- ============================================

-- Step 1: Harden get_my_role() with COALESCE
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'tenant')
  FROM profiles
  WHERE id = auth.uid();
$$;

-- Step 2: Drop the problematic admin profile read policy
DROP POLICY IF EXISTS "admin read all profiles" ON profiles;

-- Step 3: Recreate admin profile read policy - EXCLUDE own profile
-- Self-read policy handles user's own profile (guarantees 1 row)
-- This policy handles admin reading OTHER profiles
CREATE POLICY "admin read all profiles" ON profiles
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'admin'
  AND id != auth.uid()
);

-- Step 4: Ensure self-read policy exists (should already exist)
DROP POLICY IF EXISTS "self read profile" ON profiles;
CREATE POLICY "self read profile" ON profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Step 5: Verify the fix
-- This should return exactly ONE row for the current user
-- SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- ============================================
-- VERIFICATION QUERIES (run after the fix)
-- ============================================
-- Check policies on profiles table:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
--
-- Test as admin - should return only YOUR profile:
-- SELECT * FROM profiles WHERE id = auth.uid();
