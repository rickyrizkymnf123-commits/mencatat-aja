import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createPrivateGoogleSheet } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

const SUPERADMIN_EMAIL = 'rickyizkymnf123@gmail.com';
const SUPERADMIN_PASS = 'Ds2026';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());

    let adminUserId: string;

    if (existingUser) {
      adminUserId = existingUser.id;
      await supabase.auth.admin.updateUserById(adminUserId, {
        password: SUPERADMIN_PASS,
        email_confirm: true,
      });
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASS,
        email_confirm: true,
        user_metadata: { full_name: 'Ricky Rizky (Superadmin Utama)' },
      });

      if (createErr || !newUser.user) {
        return NextResponse.json({ ok: false, error: createErr?.message || 'Gagal membuat superadmin auth' }, { status: 500 });
      }
      adminUserId = newUser.user.id;
    }

    const sheetRes = await createPrivateGoogleSheet('Ricky Rizky Superadmin', SUPERADMIN_EMAIL);

    await supabase.from('profiles').upsert({
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

    return NextResponse.json({
      ok: true,
      message: `Akun Superadmin Utama (${SUPERADMIN_EMAIL}) berhasil dibuat dan disetujui!`,
      credentials: {
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASS,
        role: 'admin',
        account_status: 'approved',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
