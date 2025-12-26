-- Migration: Fix RLS recursion by using a SECURITY DEFINER function
-- This prevents infinite loops when RLS policies need to check user roles

-- Step 1: Create a function that bypasses RLS to get user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "self read profile" ON profiles;
DROP POLICY IF EXISTS "mgr/admin read profiles" ON profiles;
DROP POLICY IF EXISTS "admin delete profiles" ON profiles;
DROP POLICY IF EXISTS "manager read properties" ON properties;
DROP POLICY IF EXISTS "tenant read leased property" ON properties;
DROP POLICY IF EXISTS "admin delete properties" ON properties;
DROP POLICY IF EXISTS "manager read units" ON units;
DROP POLICY IF EXISTS "tenant read leased unit" ON units;
DROP POLICY IF EXISTS "manager delete units" ON units;
DROP POLICY IF EXISTS "tenant read own lease" ON leases;
DROP POLICY IF EXISTS "manager read leases" ON leases;
DROP POLICY IF EXISTS "admin delete leases" ON leases;
DROP POLICY IF EXISTS "tenant read payments" ON payments;
DROP POLICY IF EXISTS "manager read payments" ON payments;
DROP POLICY IF EXISTS "tenant update own payments" ON payments;
DROP POLICY IF EXISTS "manager update payments" ON payments;
DROP POLICY IF EXISTS "manager delete payments" ON payments;
DROP POLICY IF EXISTS "tenant read maint" ON maintenance_requests;
DROP POLICY IF EXISTS "tenant create maint" ON maintenance_requests;
DROP POLICY IF EXISTS "manager read maint" ON maintenance_requests;
DROP POLICY IF EXISTS "manager update maint" ON maintenance_requests;
DROP POLICY IF EXISTS "tenant delete own maint" ON maintenance_requests;
DROP POLICY IF EXISTS "manager delete maint" ON maintenance_requests;
DROP POLICY IF EXISTS "admin read maint" ON maintenance_requests;
DROP POLICY IF EXISTS "user read messages" ON messages;
DROP POLICY IF EXISTS "user send messages" ON messages;
DROP POLICY IF EXISTS "receiver update read" ON messages;
DROP POLICY IF EXISTS "user delete own messages" ON messages;
DROP POLICY IF EXISTS "manager read expenses" ON expenses;
DROP POLICY IF EXISTS "manager write expenses" ON expenses;
DROP POLICY IF EXISTS "manager update expenses" ON expenses;
DROP POLICY IF EXISTS "manager delete expenses" ON expenses;

-- Step 3: Recreate policies using get_my_role() instead of querying profiles

-- PROFILES (simple - user can read own profile)
CREATE POLICY "self read profile" ON profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Admin can read all profiles
CREATE POLICY "admin read all profiles" ON profiles
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

-- Admin can delete profiles (not self)
CREATE POLICY "admin delete profiles" ON profiles
FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin' AND id != auth.uid());

-- PROPERTIES
CREATE POLICY "admin read properties" ON properties
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read own properties" ON properties
FOR SELECT TO authenticated
USING (manager_id = auth.uid());

CREATE POLICY "tenant read leased property" ON properties
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l
    JOIN units u ON u.id = l.unit_id
    WHERE l.tenant_id = auth.uid()
      AND l.is_active = true
      AND u.property_id = properties.id
  )
);

CREATE POLICY "admin delete properties" ON properties
FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin');

-- UNITS
CREATE POLICY "admin read units" ON units
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read own units" ON units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = units.property_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "tenant read leased unit" ON units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l
    WHERE l.tenant_id = auth.uid()
      AND l.is_active = true
      AND l.unit_id = units.id
  )
);

CREATE POLICY "manager delete units" ON units
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = units.property_id AND pr.manager_id = auth.uid()
  )
);

-- LEASES
CREATE POLICY "tenant read own lease" ON leases
FOR SELECT TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "admin read leases" ON leases
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read leases" ON leases
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = leases.unit_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "admin delete leases" ON leases
FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin');

-- PAYMENTS
CREATE POLICY "tenant read payments" ON payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l 
    WHERE l.id = payments.lease_id AND l.tenant_id = auth.uid()
  )
);

CREATE POLICY "admin read payments" ON payments
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read payments" ON payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l 
    JOIN units u ON u.id = l.unit_id
    JOIN properties pr ON pr.id = u.property_id
    WHERE l.id = payments.lease_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "tenant update own payments" ON payments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l 
    WHERE l.id = payments.lease_id AND l.tenant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases l 
    WHERE l.id = payments.lease_id AND l.tenant_id = auth.uid()
  )
);

CREATE POLICY "manager update payments" ON payments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l 
    JOIN units u ON u.id = l.unit_id
    JOIN properties pr ON pr.id = u.property_id
    WHERE l.id = payments.lease_id AND pr.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases l 
    JOIN units u ON u.id = l.unit_id
    JOIN properties pr ON pr.id = u.property_id
    WHERE l.id = payments.lease_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager delete payments" ON payments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases l 
    JOIN units u ON u.id = l.unit_id
    JOIN properties pr ON pr.id = u.property_id
    WHERE l.id = payments.lease_id AND pr.manager_id = auth.uid()
  )
);

-- MAINTENANCE REQUESTS
CREATE POLICY "tenant read maint" ON maintenance_requests
FOR SELECT TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "tenant create maint" ON maintenance_requests
FOR INSERT TO authenticated
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "admin read maint" ON maintenance_requests
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read maint" ON maintenance_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = maintenance_requests.unit_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager update maint" ON maintenance_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = maintenance_requests.unit_id AND pr.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = maintenance_requests.unit_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "tenant delete own maint" ON maintenance_requests
FOR DELETE TO authenticated
USING (tenant_id = auth.uid() AND status = 'open');

CREATE POLICY "manager delete maint" ON maintenance_requests
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = maintenance_requests.unit_id AND pr.manager_id = auth.uid()
  )
);

-- MESSAGES
CREATE POLICY "user read messages" ON messages
FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "user send messages" ON messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "receiver update read" ON messages
FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "user delete own messages" ON messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- EXPENSES
CREATE POLICY "admin read expenses" ON expenses
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager read expenses" ON expenses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = expenses.property_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager write expenses" ON expenses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = expenses.property_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager update expenses" ON expenses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = expenses.property_id AND pr.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = expenses.property_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager delete expenses" ON expenses
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = expenses.property_id AND pr.manager_id = auth.uid()
  )
);

-- Step 4: Ensure column-level grants are in place
REVOKE UPDATE ON payments FROM authenticated;
GRANT UPDATE (status, paid_at, payment_method) ON payments TO authenticated;

REVOKE UPDATE ON messages FROM authenticated;
GRANT UPDATE (is_read) ON messages TO authenticated;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases (unit_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units (property_id);
CREATE INDEX IF NOT EXISTS idx_properties_manager_id ON properties (manager_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments (lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON maintenance_requests (unit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses (property_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages (receiver_id);
