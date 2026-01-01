import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[CREATE MANAGER] Direct handler - request received');
    
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    console.log('[CREATE MANAGER] Token received');

    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    console.log('[CREATE MANAGER] Env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        message: "Server configuration error",
        details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey }
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    // Verify the user's token and check role
    console.log('[CREATE MANAGER] Verifying user token...');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CREATE MANAGER] Auth error:', authError?.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('[CREATE MANAGER] User authenticated:', user.email);

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      console.error('[CREATE MANAGER] User role:', userRole, '- not admin');
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('[CREATE MANAGER] Admin verified, processing request...');

    // Parse request body
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    console.log('[CREATE MANAGER] Creating manager:', email);

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    // Create auth user
    console.log('[CREATE MANAGER] Creating auth user...');
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: "manager",
      },
    });

    if (createError || !authData?.user) {
      console.error('[CREATE MANAGER] Create user error:', createError?.message);
      return res.status(400).json({ message: createError?.message || "Failed to create manager" });
    }

    console.log('[CREATE MANAGER] Auth user created:', authData.user.id);

    // Create profile record
    console.log('[CREATE MANAGER] Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        name,
        role: "manager",
        phone: phone || null,
      });

    if (profileError) {
      console.error('[CREATE MANAGER] Profile error:', profileError.message);
      return res.status(400).json({ message: profileError.message || "Failed to create profile" });
    }

    console.log('[CREATE MANAGER] Manager created successfully');

    return res.status(200).json({
      message: "Manager created successfully",
      userId: authData.user.id,
      email,
      name,
      tempPassword,
    });

  } catch (error: any) {
    console.error('[CREATE MANAGER] Unexpected error:', error);
    return res.status(500).json({ 
      message: error?.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
