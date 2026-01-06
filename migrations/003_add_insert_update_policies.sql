-- Migration: Add INSERT and UPDATE policies for properties, units, leases, payments
-- Missing policies that prevent admins/managers from creating records

-- PROPERTIES - Admin can insert and update
CREATE POLICY "admin insert properties" ON properties
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin update properties" ON properties
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- Manager can insert properties (they become the manager)
CREATE POLICY "manager insert properties" ON properties
FOR INSERT TO authenticated
WITH CHECK (manager_id = auth.uid());

-- Manager can update own properties
CREATE POLICY "manager update own properties" ON properties
FOR UPDATE TO authenticated
USING (manager_id = auth.uid())
WITH CHECK (manager_id = auth.uid());

-- UNITS - Admin can insert and update
CREATE POLICY "admin insert units" ON units
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin update units" ON units
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin delete units" ON units
FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin');

-- Manager can insert units for their properties
CREATE POLICY "manager insert units" ON units
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = units.property_id AND pr.manager_id = auth.uid()
  )
);

-- Manager can update units for their properties
CREATE POLICY "manager update units" ON units
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = units.property_id AND pr.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties pr 
    WHERE pr.id = units.property_id AND pr.manager_id = auth.uid()
  )
);

-- LEASES - Admin and manager can insert and update
CREATE POLICY "admin insert leases" ON leases
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin update leases" ON leases
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "manager insert leases" ON leases
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = leases.unit_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager update leases" ON leases
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = leases.unit_id AND pr.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = leases.unit_id AND pr.manager_id = auth.uid()
  )
);

CREATE POLICY "manager delete leases" ON leases
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties pr ON pr.id = u.property_id
    WHERE u.id = leases.unit_id AND pr.manager_id = auth.uid()
  )
);

-- PAYMENTS - Admin and manager can insert
CREATE POLICY "admin insert payments" ON payments
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin update payments" ON payments
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin delete payments" ON payments
FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin');

CREATE POLICY "manager insert payments" ON payments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases l 
    JOIN units u ON u.id = l.unit_id
    JOIN properties pr ON pr.id = u.property_id
    WHERE l.id = payments.lease_id AND pr.manager_id = auth.uid()
  )
);

-- PROFILES - Admin can insert profiles (for creating users)
CREATE POLICY "admin insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin update profiles" ON profiles
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "self update profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
