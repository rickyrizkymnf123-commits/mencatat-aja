'use strict';
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseUrl } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'email' | 'phone'>('phone');
  
  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Onboarding questions
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswer, setOnboardingAnswer] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<string[]>(['Cash', 'BCA']);
  
  // OTP logic
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock User ID for local session simulations
  const [tempUserId, setTempUserId] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');
      
      if (isPlaceholder) {
        console.log('Using simulated Google Login fallback because Supabase URL is not configured.');
        
        localStorage.setItem('Mencatat Aja_user_id', 'usr_google_demo');
        localStorage.setItem('Mencatat Aja_user_name', 'Demo User Google');
        localStorage.setItem('Mencatat Aja_user_phone', '081234567890');
        localStorage.setItem('Mencatat Aja_plan', 'Pro'); // default Pro for demo ease
        localStorage.setItem('Mencatat Aja_telegram_token', 'TD-LINKED');
        
        alert('🌐 Mode Demo Localhost: Menggunakan akun simulasi Google.');
        router.push('/dashboard');
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal login menggunakan Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setErrorMessage('Nomor HP wajib diisi');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    // Simulate OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
    }, 1000);
  };

  const handleVerifyOtpOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: method,
          action: mode,
          email: method === 'email' ? email : undefined,
          password: method === 'email' ? password : undefined,
          phoneNumber: method === 'phone' ? phoneNumber : undefined,
          fullName: fullName || undefined,
          otpCode: method === 'phone' ? otpCode : undefined
        }),
      });

      const resData = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setErrorMessage(resData.error || 'Terjadi kesalahan saat memproses login.');
        return;
      }

      const user = resData.user;
      setTempUserId(user.id);

      if (mode === 'register') {
        setShowOnboarding(true);
      } else {
        // Successful login
        localStorage.setItem('Mencatat Aja_user_id', user.id);
        localStorage.setItem('Mencatat Aja_user_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nasabah Mencatat Aja');
        localStorage.setItem('Mencatat Aja_user_phone', user.phone || phoneNumber || '');
        localStorage.setItem('Mencatat Aja_plan', 'Starter');
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Internal server error');
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tempUserId,
          onboardingAnswer,
          defaultWallets: selectedWallets,
          fullName: fullName || 'Budi Santoso',
          phoneNumber: phoneNumber || '081234567890',
        }),
      });

      const resData = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setErrorMessage(resData.error || 'Terjadi kesalahan saat menyimpan onboarding.');
        return;
      }

      // Save user session details
      localStorage.setItem('Mencatat Aja_user_id', tempUserId);
      localStorage.setItem('Mencatat Aja_user_name', fullName || 'Budi Santoso');
      localStorage.setItem('Mencatat Aja_user_phone', phoneNumber || '081234567890');
      localStorage.setItem('Mencatat Aja_telegram_token', resData.telegramLinkToken);
      localStorage.setItem('Mencatat Aja_plan', 'Starter');
      
      router.push('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Internal server error');
    }
  };

  const toggleWalletSelection = (wallet: string) => {
    if (selectedWallets.includes(wallet)) {
      if (selectedWallets.length > 1) {
        setSelectedWallets(prev => prev.filter(w => w !== wallet));
      }
    } else {
      setSelectedWallets(prev => [...prev, wallet]);
    }
  };

  return (
    <div className="auth-container">
      <style jsx global>{`
        .auth-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--background);
        }
        
        /* Left branding panel */
        .branding-panel {
          width: 40%;
          background: var(--primary-bg-gradient);
          color: #ffffff;
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .branding-logo {
          font-size: 1.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .branding-mid h2 {
          font-size: 3rem;
          line-height: 1.15;
          margin-bottom: 20px;
        }
        .branding-mid p {
          font-size: 1.15rem;
          opacity: 0.9;
          line-height: 1.5;
        }
        .branding-bottom {
          font-size: 0.9rem;
          opacity: 0.7;
        }
        
        /* Decorative background shapes for left panel */
        .branding-panel::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
          top: -100px;
          right: -100px;
        }
        
        /* Right Form Panel */
        .form-panel {
          width: 60%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 10%;
          background: #ffffff;
        }
        .form-box {
          width: 100%;
          max-width: 450px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .form-header h2 {
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .form-header p {
          color: var(--text-muted);
          font-size: 0.95rem;
        }
        .form-header a {
          font-weight: 600;
        }

        /* Tabs */
        .method-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          gap: 24px;
        }
        .tab-btn {
          background: transparent;
          border: none;
          padding: 10px 4px;
          font-weight: 600;
          color: var(--text-muted);
          position: relative;
        }
        .tab-btn.active {
          color: var(--primary);
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary);
        }

        /* Form Controls */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .btn-submit {
          width: 100%;
          margin-top: 10px;
        }
        
        .alert-error {
          background-color: var(--error-light);
          color: var(--error);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid hsla(350, 80%, 48%, 0.1);
        }
        
        .oauth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-light);
          font-size: 0.85rem;
          margin: 16px 0;
        }
        .oauth-divider::before, .oauth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }
        .oauth-divider:not(:empty)::before {
          margin-right: .5em;
        }
        .oauth-divider:not(:empty)::after {
          margin-left: .5em;
        }
        
        .btn-google {
          background: #ffffff;
          border: 1px solid var(--border);
          color: var(--text-main);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          font-weight: 600;
        }
        .btn-google:hover {
          background: var(--background);
        }

        /* Onboarding Screen specific */
        .wallet-select-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 8px;
        }
        .wallet-option {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }
        .wallet-option.selected {
          border-color: var(--primary);
          background-color: var(--primary-light);
          color: var(--primary);
        }

        @media (max-width: 1024px) {
          .branding-panel {
            display: none;
          }
          .form-panel {
            width: 100%;
            padding: 40px 24px;
          }
        }
      `}</style>

      {/* LEFT BRANDING PANEL */}
      <div className="branding-panel">
        <Link href="/" className="branding-logo">
          🏦 Mencatat Aja
        </Link>
        <div className="branding-mid">
          <h2>Keuanganmu.<br />Terkontrol.</h2>
          <p>Mencatat transaksi harian secepat mengirim pesan chat. Bersiaplah terkejut melihat ke mana mengalirnya sisa gaji Anda.</p>
        </div>
        <div className="branding-bottom">
          &copy; {new Date().getFullYear()} Mencatat Aja. Dibuat dengan cinta untuk Indonesia.
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="form-panel animate-fade-in">
        <div className="form-box">
          {/* ONBOARDING FLOW */}
          {showOnboarding ? (
            <form onSubmit={handleCompleteOnboarding} className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="form-header">
                <h2>Rekomendasi AI Kategori</h2>
                <p>Jawab pertanyaan singkat di bawah ini agar AI kami merekomendasikan kategori pengeluaran & pemasukan yang cocok untuk gaya hidup Anda.</p>
              </div>

              {errorMessage && <div className="alert-error">{errorMessage}</div>}

              <div className="form-group">
                <label htmlFor="onboardingAnswer">Apa pekerjaan Anda & untuk apa saja Anda biasanya membelanjakan uang?</label>
                <textarea
                  id="onboardingAnswer"
                  rows={3}
                  required
                  placeholder="Contoh: Saya freelancer, sering jajan kopi sore, makan di luar, sewa apartemen, bayar gym, dan bayar pulsa..."
                  value={onboardingAnswer}
                  onChange={e => setOnboardingAnswer(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Pilih Dompet Awal Anda (Bisa pilih lebih dari satu)</label>
                <div className="wallet-select-grid">
                  {['Cash', 'BCA', 'Gopay', 'Mandiri', 'OVO', 'ShopeePay'].map(w => (
                    <div
                      key={w}
                      onClick={() => toggleWalletSelection(w)}
                      className={`wallet-option ${selectedWallets.includes(w) ? 'selected' : ''}`}
                    >
                      {w}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary btn-submit">
                {isLoading ? 'Sedang Menyiapkan Data...' : 'Selesaikan & Buka Dashboard →'}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN / REGISTER FLOW */
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="form-header">
                {mode === 'login' ? (
                  <>
                    <h2>Selamat Datang Kembali</h2>
                    <p>
                      Belum punya akun?{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setOtpSent(false); }}>
                        Daftar Gratis
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Mulai Kelola Uangmu</h2>
                    <p>
                      Sudah memiliki akun?{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setOtpSent(false); }}>
                        Masuk Sekarang
                      </a>
                    </p>
                  </>
                )}
              </div>

              {errorMessage && <div className="alert-error">{errorMessage}</div>}

              {/* Method selection tabs */}
              <div className="method-tabs">
                <button
                  onClick={() => { setMethod('phone'); setOtpSent(false); }}
                  className={`tab-btn ${method === 'phone' ? 'active' : ''}`}
                >
                  Nomor HP (Verifikasi OTP)
                </button>
                <button
                  onClick={() => { setMethod('email'); setOtpSent(false); }}
                  className={`tab-btn ${method === 'email' ? 'active' : ''}`}
                >
                  Email & Password
                </button>
              </div>

              {/* Verification Form */}
              {method === 'phone' ? (
                /* Phone flow */
                !otpSent ? (
                  <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mode === 'register' && (
                      <div className="form-group">
                        <label htmlFor="fullName">Nama Lengkap</label>
                        <input
                          id="fullName"
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap Anda"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="phoneNumber">Nomor Handphone (Link ke Telegram)</label>
                      <input
                        id="phoneNumber"
                        type="tel"
                        required
                        placeholder="Contoh: 08123456789"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                      />
                      <span style={{ fontSize: '0.75rem', color: '--text-light' }}>
                        Nomor HP digunakan untuk mencocokkan chat dari Telegram Bot Anda.
                      </span>
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary btn-submit">
                      {isLoading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtpOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="otpCode">Kode Verifikasi OTP (6 digit)</label>
                      <input
                        id="otpCode"
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Masukkan 6 digit kode OTP"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                        💡 Masukkan kode demo <b>123456</b> untuk melewati verifikasi localhost.
                      </span>
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary btn-submit">
                      {isLoading ? 'Verifikasi...' : 'Verifikasi & Lanjutkan'}
                    </button>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setOtpSent(false); }}
                      style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}
                    >
                      Kembali masukkan nomor HP
                    </a>
                  </form>
                )
              ) : (
                /* Email flow */
                <form onSubmit={handleVerifyOtpOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {mode === 'register' && (
                    <div className="form-group">
                      <label htmlFor="fullName">Nama Lengkap</label>
                      <input
                        id="fullName"
                        type="text"
                        required
                        placeholder="Masukkan nama lengkap"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="email">Alamat Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Kata Sandi (Password)</label>
                    <input
                      id="password"
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={isLoading} className="btn btn-primary btn-submit">
                    {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
                  </button>
                </form>
              )}

              {/* Google OAuth Login */}
              <div className="oauth-divider">atau menggunakan</div>
              <button
                onClick={handleGoogleLogin}
                className="btn-google"
                disabled={isLoading}
              >
                <span style={{ fontSize: '1.2rem' }}>🌐</span> Lanjutkan dengan Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
