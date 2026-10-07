import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createPrivateGoogleSheet } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProf || adminProf.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Access denied. Superadmin only.' }, { status: 403 });
    }

    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, users: profiles });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProf || adminProf.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Access denied. Superadmin only.' }, { status: 403 });
    }

    const { email, password, fullName, phone, plan, role, accountStatus } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, error: 'Email, password, dan nama lengkap wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const normalizedPlan = (plan && String(plan).toLowerCase() === 'pro') ? 'Pro' : 'Starter';
    const isPro = normalizedPlan === 'Pro';

    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName, 
        phone_number: phone,
        plan: normalizedPlan,
        is_approved: accountStatus !== 'pending'
      },
    });

    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 400 });
    }

    const newUserId = authUser.user.id;
    const sheetRes = await createPrivateGoogleSheet(fullName, cleanEmail);

    const { data: newProfile, error: profErr } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        email: cleanEmail,
        phone_number: phone || null,
        full_name: fullName,
        plan: normalizedPlan,
        monthly_transaction_limit: isPro ? 999999 : 50,
        role: role || 'user',
        account_status: accountStatus || 'approved',
        google_sheet_id: sheetRes?.sheetId || null,
        google_sheet_url: sheetRes?.sheetUrl || null,
        currency: 'IDR',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profErr) {
      return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: newProfile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProf || adminProf.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Access denied. Superadmin only.' }, { status: 403 });
    }

    const { targetUserId, accountStatus, plan, role } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'targetUserId wajib diisi' }, { status: 400 });
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (accountStatus) updatePayload.account_status = accountStatus;
    
    let normalizedPlan: 'Starter' | 'Pro' | undefined = undefined;
    if (plan !== undefined && plan !== null) {
      const p = String(plan).toLowerCase();
      normalizedPlan = (p === 'pro') ? 'Pro' : 'Starter';
      updatePayload.plan = normalizedPlan;
      updatePayload.monthly_transaction_limit = (normalizedPlan === 'Pro') ? 999999 : 50;
    }
    if (role) updatePayload.role = role;

    const { data: updatedProfile, error } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Synchronize auth user metadata
    try {
      const { data: authUserData } = await adminClient.auth.admin.getUserById(targetUserId);
      const existingMeta = authUserData?.user?.user_metadata || {};
      const newMeta = { ...existingMeta };
      if (normalizedPlan) newMeta.plan = normalizedPlan;
      if (accountStatus) newMeta.is_approved = accountStatus === 'approved';
      await adminClient.auth.admin.updateUserById(targetUserId, { user_metadata: newMeta });
    } catch (metaErr) {
      console.warn('Could not update user metadata in auth:', metaErr);
    }

    return NextResponse.json({ ok: true, user: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProf || adminProf.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Access denied. Superadmin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'targetUserId wajib diisi' }, { status: 400 });
    }

    await adminClient.auth.admin.deleteUser(targetUserId);
    await adminClient.from('profiles').delete().eq('id', targetUserId);

    return NextResponse.json({ ok: true, message: 'User berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
