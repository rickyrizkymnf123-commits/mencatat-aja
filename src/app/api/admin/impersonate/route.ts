import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const adminClient = createAdminClient();
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Khusus Superadmin' }, { status: 403 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'targetUserId wajib disertakan' }, { status: 400 });
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Set impersonation cookie or session key
    const response = NextResponse.json({
      ok: true,
      message: `Berhasil impersonate user ${targetProfile.full_name}`,
      targetUser: targetProfile,
    });

    response.cookies.set('impersonate_user_id', targetUserId, {
      path: '/',
      httpOnly: true,
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true, message: 'Kembali ke sesi admin' });
  response.cookies.delete('impersonate_user_id');
  return response;
}
