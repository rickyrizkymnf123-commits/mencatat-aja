import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder || !userId) {
      return NextResponse.json({
        success: true,
        plan: 'Pro',
        subscription_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        is_free_access: false,
        is_active: true,
        days_remaining: 30,
        status: 'active',
        admin_whatsapp: '6281234567890'
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        success: true,
        plan: 'Starter',
        subscription_end: null,
        is_free_access: false,
        is_active: true,
        days_remaining: 0,
        status: 'starter',
        admin_whatsapp: '6281234567890'
      });
    }

    let daysRemaining = 0;
    let status = 'starter';

    if (profile.is_free_access) {
      status = 'free_access';
      daysRemaining = 999;
    } else if (profile.subscription_end) {
      const endMs = new Date(profile.subscription_end).getTime();
      const nowMs = Date.now();
      daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / 86400000));
      if (daysRemaining > 0 && profile.is_active !== false) {
        status = 'active';
      } else {
        status = 'expired';
      }
    }

    return NextResponse.json({
      success: true,
      plan: profile.plan || (status === 'active' || status === 'free_access' ? 'Pro' : 'Starter'),
      subscription_end: profile.subscription_end,
      is_free_access: !!profile.is_free_access,
      is_active: profile.is_active !== false,
      days_remaining: daysRemaining,
      status: status,
      admin_whatsapp: '6281234567890'
    });
  } catch (err: any) {
    console.error('Fetch user subscription error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
