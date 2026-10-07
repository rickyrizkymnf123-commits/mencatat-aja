import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createPrivateGoogleSheet } from '@/lib/google-sheets';

const SUPERADMIN_EMAIL = 'rickyizkymnf123@gmail.com';
const SUPERADMIN_PASS = 'Ds2026';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = cleanEmail === SUPERADMIN_EMAIL.toLowerCase();

    const adminSupabase = createAdminClient();

    // Special auto-recovery for Superadmin if credentials match
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
        });
      } else {
        const { data: newUser } = await adminSupabase.auth.admin.createUser({
          email: SUPERADMIN_EMAIL,
          password: SUPERADMIN_PASS,
          email_confirm: true,
          user_metadata: { full_name: 'Ricky Rizky (Superadmin Utama)' },
        });
        adminUserId = newUser?.user?.id || 'admin-super-id';
      }

      // Ensure profile exists with admin role & approved status
      const sheetRes = await createPrivateGoogleSheet('Ricky Rizky Superadmin', SUPERADMIN_EMAIL);
      await adminSupabase.from('profiles').upsert({
        id: adminUserId,
        email: SUPERADMIN_EMAIL,
        full_name: 'Ricky Rizky (Superadmin Utama)',
        plan: 'pro',
        role: 'admin',
        account_status: 'approved',
        google_sheet_id: sheetRes?.sheetId || null,
        google_sheet_url: sheetRes?.sheetUrl || null,
        telegram_connection_status: 'disconnected',
        default_currency: 'IDR',
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
        // Force session or bypass auth error
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

    // Default profile if not found but is superadmin
    if (!profile && isSuperAdmin) {
      profile = {
        role: 'admin',
        account_status: 'approved',
        full_name: 'Ricky Rizky (Superadmin Utama)',
      };
    }

    if (profile) {
      if (profile.account_status === 'pending') {
        return NextResponse.json({
          ok: false,
          statusState: 'pending',
          error: `⏳ Halo ${profile.full_name || ''}, akun kamu sedang dalam antrean persetujuan (ACC) oleh Admin. Kamu akan bisa masuk ke dashboard setelah disetujui oleh Admin.`,
        });
      }

      if (profile.account_status === 'rejected') {
        return NextResponse.json({
          ok: false,
          statusState: 'rejected',
          error: `🔴 Pendaftaran akun kamu telah ditolak oleh Admin.`,
        });
      }
    }

    const redirectUrl = profile?.role === 'admin' ? '/admin' : '/dashboard';

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
