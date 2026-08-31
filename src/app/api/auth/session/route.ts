import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, supabaseUrl } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, action, email, password, phoneNumber, fullName, otpCode } = body;

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      console.log('Using simulated auth session fallback because Supabase URL is not configured.');
      if (method === 'phone') {
        if (!phoneNumber) {
          return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 });
        }
        if (otpCode !== '123456') {
          return NextResponse.json({ error: 'Kode OTP salah! Gunakan kode demo: 123456' }, { status: 400 });
        }
        const randId = 'usr_mock_phone_' + Math.floor(1000 + Math.random() * 9000);
        return NextResponse.json({
          success: true,
          user: {
            id: randId,
            email: null,
            phone: phoneNumber,
            user_metadata: {
              full_name: fullName || 'Nasabah (Simulasi)'
            }
          },
          session: null
        });
      } else {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
        }
        const randId = 'usr_mock_email_' + Math.floor(1000 + Math.random() * 9000);
        return NextResponse.json({
          success: true,
          user: {
            id: randId,
            email: email,
            phone: null,
            user_metadata: {
              full_name: fullName || email.split('@')[0]
            }
          },
          session: null
        });
      }
    }

    if (method === 'phone') {
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 });
      }

      // Check OTP
      if (otpCode !== '123456') {
        return NextResponse.json({ error: 'Kode OTP salah! Gunakan kode demo: 123456' }, { status: 400 });
      }

      // Check if profile exists
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (action === 'login') {
        if (!profile) {
          return NextResponse.json({ error: 'Nomor HP belum terdaftar. Silakan daftar terlebih dahulu.' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          user: {
            id: profile.id,
            email: null,
            phone: profile.phone_number,
            user_metadata: {
              full_name: profile.full_name,
            }
          },
          session: null // simulated session for phone login
        });
      } else {
        // Register action
        if (profile) {
          return NextResponse.json({ error: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 400 });
        }

        // Create user in auth.users using Admin API to bypass SMS Gateway config
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          user_metadata: {
            full_name: fullName || 'Pengguna Baru'
          }
        });

        if (authError || !authUser.user) {
          console.error('Failed to create auth user:', authError);
          return NextResponse.json({ error: authError?.message || 'Gagal mendaftarkan akun di server auth.' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          user: authUser.user,
          session: null
        });
      }
    } else {
      // Email method
      if (!email || !password) {
        return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
      }

      if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data.user) {
          return NextResponse.json({ error: error?.message || 'Email atau password salah.' }, { status: 400 });
        }

        // Check if profile exists in public.profiles. If not, create default profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          // Fallback onboarding / profile creation
          const randVal = Math.floor(100000 + Math.random() * 900000);
          await supabaseAdmin.from('profiles').insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            telegram_link_token: `TD-${randVal}`,
            plan: 'Starter'
          });
        }

        return NextResponse.json({
          success: true,
          user: data.user,
          session: data.session
        });
      } else {
        // Register action
        // Create user with Admin API to bypass email verification email requirements on localhost
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || 'Pengguna Baru'
          }
        });

        if (authError || !authUser.user) {
          console.error('Failed to create auth user:', authError);
          return NextResponse.json({ error: authError?.message || 'Gagal membuat akun email.' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          user: authUser.user,
          session: null
        });
      }
    }
  } catch (err: any) {
    console.error('Session route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
