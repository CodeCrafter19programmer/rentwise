-- Migration: Fix profiles RLS recursion causing PostgREST 500 errors
--
-- Symptom: REST calls to /rest/v1/profiles (and other tables using profiles in policies)
-- return 500 due to infinite recursion in a policy.
--
-- Root cause: A policy on profiles references profiles again:
--   "mgr/admin read profiles"
-- This triggers infinite recursion during RLS evaluation.

-- Drop the recursive policy (keep "self read profile")
drop policy if exists "mgr/admin read profiles" on profiles;

-- Note:
-- If you need admins/managers to read other users' profiles, do NOT re-add a policy
-- that queries profiles from within a profiles policy.
-- Use a non-recursive approach (e.g., server-side endpoints using service role, or
-- JWT custom claims/app_metadata + auth.jwt()).
