import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';
import { getPricingConfig, savePricingConfig } from '@/lib/pricing';

export async function GET(request: Request) {
  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    const pricing = await getPricingConfig();

    if (isPlaceholder) {
      return NextResponse.json({
        success: true,
        pricing,
        subscriptions: [
          {
            id: 'usr_budi',
            user_id: 'usr_budi',
            name: 'Budi Santoso (Demo)',
            email: 'budi@demo.com',
            phone: '081234567890',
            plan: 'Pro',
            subscription_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            is_free_access: false,
            is_active: true,
            notes: 'Langganan Bulanan Midtrans',
            created_at: new Date().toISOString()
          },
          {
            id: 'usr_ani',
            user_id: 'usr_ani',
            name: 'Ani Wijaya (Demo)',
            email: 'ani@demo.com',
            phone: '089876543210',
            plan: 'Basic',
            subscription_end: null,
            is_free_access: false,
            is_active: true,
            notes: 'Basic Tier Akun Baru',
            created_at: new Date().toISOString()
          },
          {
            id: 'usr_catur',
            user_id: 'usr_catur',
            name: 'Catur Nugroho (Demo VIP)',
            email: 'catur@vip.com',
            phone: '081122334455',
            plan: 'Pro',
            subscription_end: null,
            is_free_access: true,
            is_active: true,
            notes: 'Free Access VIP Selamanya',
            created_at: new Date().toISOString()
          }
        ]
      });
    }

    const [authRes, profsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })
    ]);

    const emailMap = new Map<string, { email: string; meta: any }>();
    if (authRes.data && authRes.data.users) {
      authRes.data.users.forEach(u => {
        emailMap.set(u.id, {
          email: u.email || '-',
          meta: u.user_metadata || {}
        });
      });
    }

    const list = (profsRes.data || []).map(p => {
      const authInfo = emailMap.get(p.id);
      let resolvedPlan = p.plan || 'Basic';
      if (resolvedPlan === 'Starter') resolvedPlan = 'Basic';

      return {
        id: p.id,
        user_id: p.id,
        name: p.full_name || authInfo?.meta?.full_name || (authInfo?.email !== '-' ? authInfo?.email?.split('@')[0] : 'User'),
        email: authInfo?.email || '-',
        phone: p.phone_number || '-',
        plan: resolvedPlan,
        subscription_end: p.subscription_end || null,
        is_free_access: !!p.is_free_access,
        is_active: p.is_active !== false,
        notes: p.notes || '',
        created_at: p.created_at
      };
    });

    return NextResponse.json({
      success: true,
      pricing,
      subscriptions: list
    });
  } catch (err: any) {
    console.error('Fetch subscriptions error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'update_pricing' || body.pricing) {
      const updatedPricing = await savePricingConfig(body.pricing || body);
      return NextResponse.json({
        success: true,
        message: 'Pengaturan harga paket langganan berhasil disimpan!',
        pricing: updatedPricing
      });
    }

    const { userId, userIds, daysToAdd, subscriptionEnd, isFreeAccess, isActive, notes, plan } = body;

    const targets: string[] = [];
    if (userId) targets.push(userId);
    if (Array.isArray(userIds)) {
      userIds.forEach(id => {
        if (!targets.includes(id)) targets.push(id);
      });
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 400 });
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json({
        success: true,
        message: 'Berhasil memperbarui ' + targets.length + ' langganan pengguna (Mode Simulasi)',
        updatedCount: targets.length
      });
    }

    for (const id of targets) {
      let normalizedPlan: 'Starter' | 'Pro' = 'Starter';
      if (plan !== undefined && plan !== null) {
        const p = String(plan).toLowerCase();
        normalizedPlan = (p === 'pro') ? 'Pro' : 'Starter';
      } else if (isFreeAccess) {
        normalizedPlan = 'Pro';
      }

      const isPro = normalizedPlan === 'Pro';
      const updatePayload: any = {
        plan: normalizedPlan,
        monthly_transaction_limit: isPro ? 999999 : 50,
        updated_at: new Date().toISOString()
      };

      const { error: profUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', id);

      if (profUpdateErr) {
        console.error(`Error updating profiles table for user ${id}:`, profUpdateErr);
      }

      // Synchronize Supabase Auth user metadata
      try {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(id);
        const existingMeta = authUserData?.user?.user_metadata || {};
        await supabaseAdmin.auth.admin.updateUserById(id, {
          user_metadata: {
            ...existingMeta,
            plan: normalizedPlan
          }
        });
      } catch (authErr) {
        console.warn(`Could not sync auth metadata for user ${id}:`, authErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil memperbarui ' + targets.length + ' langganan pengguna',
      updatedCount: targets.length
    });
  } catch (err: any) {
    console.error('Update subscription error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
