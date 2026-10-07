import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createPrivateGoogleSheet } from '@/lib/google-sheets';

const SUPERADMIN_EMAIL = 'rickyizkymnf123@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, error: 'Semua field wajib diisi' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = cleanEmail === SUPERADMIN_EMAIL.toLowerCase();

    // 1. SignUp in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: fullName, phone_number: phone }
      }
    });

    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (userId) {
      // 2. Auto-provision private Google Sheet for the user
      const sheetRes = await createPrivateGoogleSheet(fullName, cleanEmail);

      // 3. Insert Profile
      // Superadmin is automatically approved & role 'admin', other users are 'pending' & role 'user'
      await supabase.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        phone_number: phone || null,
        phone_verified: true,
        full_name: fullName,
        plan: isSuperAdmin ? 'pro' : 'starter',
        role: isSuperAdmin ? 'admin' : 'user',
        account_status: isSuperAdmin ? 'approved' : 'pending',
        google_sheet_id: sheetRes?.sheetId || null,
        google_sheet_url: sheetRes?.sheetUrl || null,
        telegram_connection_status: 'disconnected',
        default_currency: 'IDR',
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      userId,
      accountStatus: isSuperAdmin ? 'approved' : 'pending',
      message: isSuperAdmin
        ? 'Akun Superadmin Utama berhasil didaftarkan dan langsung disetujui!'
        : 'Pendaftaran berhasil. Akun Anda sedang dalam antrean verifikasi dan persetujuan Admin.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
