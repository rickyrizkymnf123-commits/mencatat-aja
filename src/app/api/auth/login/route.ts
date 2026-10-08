import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const SUPERADMIN_EMAILS = [
  'rickyrizkymnf123@gmail.com',
  'rickyizkymnf123@gmail.com'
];
const SUPERADMIN_PASS = 'Ds2026';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = SUPERADMIN_EMAILS.includes(cleanEmail);

    const adminSupabase = createAdminClient();

    // Auto-recovery / sync for Superadmin credentials
    if (isSuperAdmin && password === SUPERADMIN_PASS) {
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      let adminUserId: string;

      if (existingUser) {
        adminUserId = existingUser.id;
        await adminSupabase.auth.admin.updateUserById(adminUserId, {
          password: SUPERADMIN_PASS,
          email_confirm: true,
          user_metadata: {
            full_name: 'Ricky Rizky (Superadmin Utama)',
            role: 'superadmin',
            is_approved: true,
          },
        });
      } else {
        const { data: newUser } = await adminSupabase.auth.admin.createUser({
          email: cleanEmail,
          password: SUPERADMIN_PASS,
          email_confirm: true,
          user_metadata: {
            full_name: 'Ricky Rizky (Superadmin Utama)',
            role: 'superadmin',
            is_approved: true,
          },
        });
        adminUserId = newUser?.user?.id || 'admin-super-id';
      }

      // Ensure profile exists with Pro plan & high limit
      await adminSupabase.from('profiles').upsert({
        id: adminUserId,
        full_name: 'Ricky Rizky (Superadmin Utama)',
        plan: 'Pro',
        monthly_transaction_limit: 999999,
        updated_at: new Date().toISOString(),
      });
    }

    // Server-side authentication with cookies
    const supabase = createClient();
    let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // Fallback attempt with admin client if signInWithPassword had issues for Superadmin
    if (authErr && isSuperAdmin && password === SUPERADMIN_PASS) {
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (existingUser) {
        authErr = null;
        authData = {
          user: existingUser as any,
          session: null as any,
        };
      }
    }

    if (authErr) {
      return NextResponse.json(
        {
          ok: false,
          error: authErr.message === 'Invalid login credentials' ? 'Email atau password salah.' : authErr.message,
        },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    let profile: any = null;

    if (userId) {
      const { data: prof } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      profile = prof;
    }

    // Default profile & metadata resolution
    const userRole = isSuperAdmin ? 'admin' : (authData.user?.user_metadata?.role || 'user');
    const isApproved = isSuperAdmin ? true : (authData.user?.user_metadata?.is_approved !== false);

    if (!isApproved) {
      return NextResponse.json({
        ok: false,
        statusState: 'pending',
        error: `⏳ Halo ${profile?.full_name || ''}, akun kamu sedang dalam antrean persetujuan (ACC) oleh Admin. Kamu akan bisa masuk ke dashboard setelah disetujui oleh Admin.`,
      });
    }

    const redirectUrl = isSuperAdmin || userRole === 'admin' || userRole === 'superadmin' ? '/admin' : '/dashboard';

    return NextResponse.json({
      ok: true,
      user: authData.user,
      profile,
      redirectUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
