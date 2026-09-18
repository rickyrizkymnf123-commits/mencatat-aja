'use strict';
'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseUrl } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Onboarding questions
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswer, setOnboardingAnswer] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<string[]>(['Cash', 'BCA']);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock User ID for local session simulations
  const [tempUserId, setTempUserId] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('Mencatat Aja_admin_mode');
      localStorage.removeItem('tatadana_admin_mode');
      localStorage.removeItem('Mencatat Aja_custom_bot_token');
      localStorage.removeItem('tatadana_custom_bot_token');
      localStorage.removeItem('tatadana_bot_token_usr_budi');
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'email',
          action: mode,
          email: email,
          password: password,
          fullName: fullName || undefined,
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
        localStorage.removeItem('Mencatat Aja_custom_bot_token');
        localStorage.removeItem('tatadana_custom_bot_token');
        localStorage.removeItem('tatadana_bot_token_usr_budi');
        localStorage.setItem('Mencatat Aja_user_id', user.id);
        localStorage.setItem('Mencatat Aja_user_email', user.email || email);
        localStorage.setItem('Mencatat Aja_user_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nasabah Mencatat Aja');
        localStorage.setItem('Mencatat Aja_user_phone', user.phone || '');
        localStorage.setItem('Mencatat Aja_plan', user.user_metadata?.plan || 'Starter');
        const role = user.user_metadata?.role || (user.email?.toLowerCase() === 'rickyrizkymnf123@gmail.com' ? 'superadmin' : 'user');
        localStorage.setItem('Mencatat Aja_role', role);
        if (role === 'superadmin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
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
          fullName: fullName || 'Nasabah Mencatat Aja',
        }),
      });

      const resData = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setErrorMessage(resData.error || 'Terjadi kesalahan saat menyimpan onboarding.');
        return;
      }

      // Save user session details
      localStorage.removeItem('Mencatat Aja_custom_bot_token');
      localStorage.removeItem('tatadana_custom_bot_token');
      localStorage.removeItem('tatadana_bot_token_usr_budi');
      localStorage.setItem('Mencatat Aja_user_id', tempUserId);
      localStorage.setItem('Mencatat Aja_user_email', email);
      localStorage.setItem('Mencatat Aja_user_name', fullName || email.split('@')[0] || 'Nasabah Mencatat Aja');
      localStorage.setItem('Mencatat Aja_telegram_token', resData.telegramLinkToken);
      localStorage.setItem('Mencatat Aja_plan', 'Starter');
      const role = email.toLowerCase() === 'rickyrizkymnf123@gmail.com' ? 'superadmin' : 'user';
      localStorage.setItem('Mencatat Aja_role', role);
      
      if (role === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
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
          background: #04060d;
          color: var(--text-main);
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
        }
        
        /* Left branding panel */
        .branding-panel {
          width: 44%;
          background: linear-gradient(145deg, #022c22 0%, #064e3b 50%, #021f1e 100%);
          color: #ffffff !important;
          padding: 60px 56px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .branding-logo {
          font-size: 1.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ffffff !important;
          text-decoration: none !important;
          letter-spacing: -0.02em;
          z-index: 2;
        }
        
        .branding-mid {
          z-index: 2;
        }
        
        .branding-mid h2 {
          font-size: 3.2rem;
          line-height: 1.15;
          margin-bottom: 20px;
          font-weight: 800;
          letter-spacing: -1px;
          color: #ffffff !important;
        }
        
        .branding-mid p {
          font-size: 1.1rem;
          opacity: 0.9;
          line-height: 1.6;
          color: #cbd5e1 !important;
          max-width: 460px;
        }

        .branding-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 32px;
        }

        .branding-feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #e2e8f0;
          width: fit-content;
        }
        
        .branding-bottom {
          font-size: 0.85rem;
          color: #94a3b8 !important;
          z-index: 2;
        }
        
        /* Decorative ambient glow shapes */
        .branding-panel::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .branding-panel::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.2) 0%, transparent 70%);
          bottom: -150px;
          left: -150px;
          pointer-events: none;
        }
        
        /* Right Form Panel */
        .form-panel {
          width: 56%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 8%;
          background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 45%), #04060d;
        }
        
        .form-card {
          width: 100%;
          max-width: 460px;
          background: rgba(13, 20, 38, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .form-header h2 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          color: #ffffff;
        }
        
        .form-header p {
          color: #94a3b8;
          font-size: 0.95rem;
        }
        
        .form-header a {
          font-weight: 700;
          color: #10b981;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        
        .form-header a:hover {
          color: #34d399;
          text-decoration: underline;
        }

        /* Form Controls */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #cbd5e1;
        }
        
        .form-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .form-input::placeholder {
          color: #64748b;
        }
        
        .form-input:focus {
          border-color: #10b981;
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        }

        .btn-submit {
          width: 100%;
          margin-top: 10px;
          padding: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 1rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
        }
        
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(16, 185, 129, 0.45);
        }
        
        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .alert-error {
          background-color: rgba(244, 63, 94, 0.12);
          color: #fb7185;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }

        /* Onboarding Screen specific */
        .wallet-select-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 4px;
        }
        
        .wallet-option {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.88rem;
          transition: all 0.15s ease;
        }
        
        .wallet-option:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .wallet-option.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.16);
          color: #34d399;
          box-shadow: 0 0 0 1px #10b981;
        }

        @media (max-width: 1024px) {
          .branding-panel {
            display: none;
          }
          .form-panel {
            width: 100%;
            padding: 40px 20px;
          }
          .form-card {
            padding: 28px 20px;
          }
          .mobile-brand-header {
            display: block !important;
          }
        }
      `}</style>

      {/* LEFT BRANDING PANEL */}
      <div className="branding-panel">
        <Link href="/" className="branding-logo">
          <span style={{ fontSize: '1.9rem' }}>🏦</span>
          <span>Mencatat Aja</span>
        </Link>
        <div className="branding-mid">
          <h2>Keuanganmu.<br />Terkontrol.</h2>
          <p>Mencatat transaksi harian secepat mengirim pesan chat. Bersiaplah terkejut melihat ke mana mengalirnya sisa gaji Anda.</p>
          <div className="branding-features">
            <div className="branding-feature-pill">
              <span>🤖</span> Asisten AI & Bot Telegram Pribadi
            </div>
            <div className="branding-feature-pill">
              <span>📸</span> Scan Struk Belanja Otomatis (Vision AI)
            </div>
            <div className="branding-feature-pill">
              <span>🔒</span> Enkripsi Data Finansial Bank-Grade
            </div>
          </div>
        </div>
        <div className="branding-bottom">
          &copy; {new Date().getFullYear()} Mencatat Aja. Dibuat dengan cinta untuk Indonesia.
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="form-panel animate-fade-in">
        <div className="form-card">
          {/* Mobile brand header */}
          <div style={{ display: 'none', marginBottom: '20px' }} className="mobile-brand-header">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#10b981', fontWeight: 800, fontSize: '1.4rem' }}>
              <span>🏦</span> Mencatat Aja
            </Link>
          </div>

          {/* ONBOARDING FLOW */}
          {showOnboarding ? (
            <form onSubmit={handleCompleteOnboarding} className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-header">
                <h2>Rekomendasi AI Kategori</h2>
                <p>Jawab pertanyaan singkat di bawah ini agar AI kami merekomendasikan kategori pengeluaran & pemasukan yang cocok untuk gaya hidup Anda.</p>
              </div>

              {errorMessage && <div className="alert-error">{errorMessage}</div>}

              <div className="form-group">
                <label htmlFor="onboardingAnswer">Apa pekerjaan Anda & untuk apa saja Anda biasanya belanja?</label>
                <textarea
                  id="onboardingAnswer"
                  rows={3}
                  required
                  className="form-input"
                  placeholder="Contoh: Saya freelancer, sering jajan kopi sore, makan di luar, sewa apartemen, bayar gym, dan bayar pulsa..."
                  value={onboardingAnswer}
                  onChange={e => setOnboardingAnswer(e.target.value)}
                  style={{ resize: 'vertical' }}
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

              <button type="submit" disabled={isLoading} className="btn-submit">
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
                      <a href="#" onClick={(e) => { e.preventDefault(); setErrorMessage(''); setMode('register'); }}>
                        Daftar Gratis
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Mulai Kelola Uangmu</h2>
                    <p>
                      Sudah memiliki akun?{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); setErrorMessage(''); setMode('login'); }}>
                        Masuk Sekarang
                      </a>
                    </p>
                  </>
                )}
              </div>

              {errorMessage && <div className="alert-error">{errorMessage}</div>}

              {/* Email & Password Form */}
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {mode === 'register' && (
                  <div className="form-group">
                    <label htmlFor="fullName">Nama Lengkap</label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Masukkan nama lengkap Anda"
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
                    className="form-input"
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
                    className="form-input"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="btn-submit">
                  {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
