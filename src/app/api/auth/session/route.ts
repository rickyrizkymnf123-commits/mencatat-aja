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
      if (method === 'phone') {
        if (!phoneNumber) {
          return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 });
        }
        if (otpCode !== '123456') {
          return NextResponse.json({ error: 'Kode OTP salah! Gunakan kode demo: 123456' }, { status: 400 });
        }
        const randId = '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000);
        return NextResponse.json({
          success: true,
          user: {
            id: randId,
            email: null,
            phone: phoneNumber,
            user_metadata: {
              full_name: fullName || 'Nasabah (Simulasi)',
              role: 'user'
            }
          },
          session: null
        });
      } else {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email dan kata sandi wajib diisi' }, { status: 400 });
        }
        const randId = '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000);
        const isSuperadmin = email.toLowerCase() === 'rickyrizkymnf123@gmail.com';
        return NextResponse.json({
          success: true,
          user: {
            id: isSuperadmin ? '58c09700-965d-4104-a344-6e599c46deff' : randId,
            email: email,
            phone: null,
            user_metadata: {
              full_name: isSuperadmin ? 'Ricky Rizky' : (fullName || email.split('@')[0]),
              role: isSuperadmin ? 'superadmin' : 'user'
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

      if (otpCode !== '123456') {
        return NextResponse.json({ error: 'Kode OTP salah! Gunakan kode demo: 123456' }, { status: 400 });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (action === 'login') {
        if (profile) {
          return NextResponse.json({
            success: true,
            user: {
              id: profile.id,
              email: null,
              phone: profile.phone_number,
              user_metadata: {
                full_name: profile.full_name,
                role: 'user'
              }
            },
            session: null
          });
        } else {
          return NextResponse.json({ error: 'Nomor HP belum terdaftar. Silakan daftar terlebih dahulu.' }, { status: 404 });
        }
      } else {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          user_metadata: {
            full_name: fullName || 'Pengguna Baru',
            role: 'user'
          }
        });

        if (authError || !authUser.user) {
          return NextResponse.json({ error: authError?.message || 'Gagal mendaftar dengan nomor HP.' }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          user: authUser.user,
          session: null
        });
      }

    } else {
      // Email authentication method
      if (!email || !password) {
        return NextResponse.json({ error: 'Email dan kata sandi wajib diisi' }, { status: 400 });
      }

      const isSuperadminEmail = email.toLowerCase() === 'rickyrizkymnf123@gmail.com';

      if (action === 'login') {
        // Special Superadmin direct password check
        if (isSuperadminEmail && (password === 'Permatasari11' || password === 'admin123')) {
          return NextResponse.json({
            success: true,
            user: {
              id: '58c09700-965d-4104-a344-6e599c46deff',
              email: 'rickyrizkymnf123@gmail.com',
              phone: '08123456789',
              user_metadata: {
                full_name: 'Ricky Rizky',
                role: 'superadmin'
              }
            },
            session: null
          });
        }

        // Standard Supabase Auth Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data.user) {
          const errMsg = error?.message === 'Invalid login credentials' 
            ? 'Email atau kata sandi salah. Silakan coba lagi atau daftar akun baru.' 
            : (error?.message || 'Gagal masuk ke akun.');
          return NextResponse.json({ error: errMsg }, { status: 401 });
        }

        // Fetch user profile name, role, and approval status
        let userName = data.user.user_metadata?.full_name || email.split('@')[0];
        let userRole = data.user.user_metadata?.role || (isSuperadminEmail ? 'superadmin' : 'user');
        
        // Approval resolution: Superadmin always approved.
        // If is_approved is explicitly false in auth user metadata, require approval.
        let isApproved = isSuperadminEmail;
        if (!isSuperadminEmail) {
          if (data.user.user_metadata?.is_approved === true) {
            isApproved = true;
          } else if (data.user.user_metadata?.is_approved === false) {
            isApproved = false;
          } else {
            // Existing users without metadata field are approved
            isApproved = true;
          }
        }

        try {
          const { data: prof } = await supabaseAdmin
            .from('profiles')
            .select('full_name, plan')
            .eq('id', data.user.id)
            .maybeSingle();
          if (prof && prof.full_name) {
            userName = prof.full_name;
          }
        } catch (e) {
          // ignore
        }

        if (!isSuperadminEmail && !isApproved) {
          return NextResponse.json({ 
            error: '⏳ Akun Anda masih menunggu persetujuan (ACC) dari Admin. Silakan hubungi admin di WhatsApp untuk konfirmasi aktivasi akun Anda.' 
          }, { status: 403 });
        }

        return NextResponse.json({
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            phone: data.user.phone,
            user_metadata: {
              full_name: userName,
              role: userRole
            }
          },
          session: data.session
        });

      } else {
        // Register action - New users require admin approval
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || email.split('@')[0],
            role: isSuperadminEmail ? 'superadmin' : 'user',
            is_approved: isSuperadminEmail ? true : false,
            phone: phoneNumber || null
          }
        });

        if (authError || !authUser.user) {
          const errMsg = authError?.message?.toLowerCase().includes('already') || authError?.message?.toLowerCase().includes('exists')
            ? 'Email ini sudah terdaftar! Silakan klik tab "Masuk" untuk login.'
            : (authError?.message || 'Gagal mendaftarkan akun.');
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }

        // Create initial profile in Supabase using valid constraint plan ('Starter')
        try {
          await supabaseAdmin.from('profiles').upsert({
            id: authUser.user.id,
            full_name: fullName || email.split('@')[0],
            plan: 'Starter', // Valid constraint in profiles_plan_check
            monthly_transaction_limit: 50,
            created_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Profile creation during register error:', e);
        }

        return NextResponse.json({
          success: true,
          user: authUser.user,
          requiresApproval: !isSuperadminEmail,
          session: null
        });
      }
    }
  } catch (err: any) {
    console.error('Session route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
