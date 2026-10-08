import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const SUPERADMIN_EMAILS = [
  'rickyrizkymnf123@gmail.com',
  'rickyizkymnf123@gmail.com'
];

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, error: 'Semua field wajib diisi' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = SUPERADMIN_EMAILS.includes(cleanEmail);

    // 1. SignUp in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          role: isSuperAdmin ? 'superadmin' : 'user',
          is_approved: isSuperAdmin ? true : true, // Auto approved
        }
      }
    });

    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (userId) {
      // 2. Insert Profile
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        phone_number: phone || null,
        plan: isSuperAdmin ? 'Pro' : 'Starter',
        monthly_transaction_limit: isSuperAdmin ? 999999 : 50,
        currency: 'IDR',
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      userId,
      accountStatus: 'approved',
      message: 'Pendaftaran berhasil! Akun Anda siap digunakan.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
