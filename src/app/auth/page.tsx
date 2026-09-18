'use strict';
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Onboarding & Approval States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswer, setOnboardingAnswer] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<string[]>(['Cash', 'BCA']);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tempUserId, setTempUserId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('Mencatat Aja_admin_mode');
      localStorage.removeItem('tatadana_admin_mode');
      localStorage.removeItem('Mencatat Aja_custom_bot_token');
      localStorage.removeItem('tatadana_custom_bot_token');
      localStorage.removeItem('tatadana_bot_token_usr_budi');

      const modeParam = searchParams.get('mode');
      if (modeParam === 'register') {
        setMode('register');
      } else if (modeParam === 'login') {
        setMode('login');
      }
    }
  }, [searchParams]);

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
        localStorage.setItem('Mencatat Aja_plan', user.user_metadata?.plan || 'Basic');
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

      // Check if superadmin
      const isSuperadmin = email.toLowerCase() === 'rickyrizkymnf123@gmail.com';
      if (isSuperadmin) {
        localStorage.setItem('Mencatat Aja_user_id', tempUserId);
        localStorage.setItem('Mencatat Aja_user_email', email);
        localStorage.setItem('Mencatat Aja_user_name', fullName || 'Ricky Rizky');
        localStorage.setItem('Mencatat Aja_role', 'superadmin');
        router.push('/admin');
      } else {
        // Normal user requires Admin ACC before login
        setShowOnboarding(false);
        setIsPendingApproval(true);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#04060d', color: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" }}>
      
      {/* LEFT BRANDING PANEL */}
      <div 
        style={{ 
          width: '44%', 
          background: 'linear-gradient(145deg, #022c22 0%, #064e3b 50%, #021f1e 100%)', 
          color: '#ffffff', 
          padding: '56px 48px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          position: 'relative', 
          overflow: 'hidden', 
          borderRight: '1px solid rgba(16, 185, 129, 0.25)' 
        }}
        className="auth-branding-panel"
      >
        {/* Glow Spheres */}
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)', top: '-100px', right: '-100px', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(5, 150, 105, 0.25) 0%, transparent 70%)', bottom: '-150px', left: '-150px', pointerEvents: 'none' }}></div>

        {/* Brand Logo Header */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', zIndex: 2 }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Mencatat<span style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aja</span>
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', letterSpacing: '0.8px', textTransform: 'uppercase', marginLeft: '10px' }}>
            💰 AI WEALTH OS
          </span>
        </Link>

        {/* Branding Mid Banner */}
        <div style={{ zIndex: 2, margin: '40px 0' }}>
          <h2 style={{ fontSize: '3rem', lineHeight: 1.15, marginBottom: '18px', fontWeight: 800, letterSpacing: '-1px', color: '#ffffff' }}>
            Keuanganmu.<br />Terkontrol.
          </h2>
          <p style={{ fontSize: '1.05rem', opacity: 0.9, lineHeight: 1.6, color: '#cbd5e1', maxWidth: '440px' }}>
            Mencatat transaksi harian secepat mengirim pesan chat. Bersiaplah terkejut melihat ke mana mengalirnya sisa gaji Anda.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', width: 'fit-content' }}>
              <span>🤖</span> Asisten AI & Bot Telegram Pribadi
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', width: 'fit-content' }}>
              <span>📸</span> Scan Struk Belanja Otomatis (Vision AI)
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', width: 'fit-content' }}>
              <span>🔒</span> Enkripsi Data Finansial Bank-Grade
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', zIndex: 2 }}>
          &copy; {new Date().getFullYear()} Mencatat Aja. Dibuat dengan cinta untuk Indonesia.
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div 
        style={{ 
          width: '56%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '40px 6%', 
          background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 45%), #04060d' 
        }}
        className="auth-form-panel"
      >
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '460px', 
            background: 'rgba(13, 20, 38, 0.85)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            backdropFilter: 'blur(24px)', 
            WebkitBackdropFilter: 'blur(24px)', 
            borderRadius: '24px', 
            padding: '36px', 
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
          }}
        >
          {/* Mobile Header Logo */}
          <div style={{ display: 'none', marginBottom: '24px' }} className="mobile-brand-header">
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                Mencatat<span style={{ color: '#10b981' }}>Aja</span>
              </span>
            </Link>
          </div>

          {/* SCREEN 1: PENDING APPROVAL SCREEN (WHEN REGISTRATION COMPLETED) */}
          {isPendingApproval ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                ⏳
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
                  Pendaftaran Berhasil!
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Akun Anda dengan email <strong style={{ color: '#ffffff' }}>{email}</strong> telah terdaftar dan saat ini <span style={{ color: '#fbbf24', fontWeight: 700 }}>menunggu persetujuan (ACC) dari Admin</span> sebelum dapat login.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>💬 Mau aktivasi lebih cepat?</div>
                <div style={{ color: '#94a3b8', lineHeight: 1.4 }}>
                  Hubungi Admin Superadmin via WhatsApp untuk meminta konfirmasi aktivasi akun Anda secara instan.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <a 
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Admin MencatatAja, saya sudah mendaftar akun baru (${email}). Mohon bantu di-ACC ya, terima kasih!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '13px', 
                    background: '#25d366', 
                    color: '#ffffff', 
                    borderRadius: '12px', 
                    fontWeight: 800, 
                    fontSize: '0.95rem', 
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <span>📱</span> Chat Admin via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsPendingApproval(false);
                    setMode('login');
                  }}
                  style={{ 
                    padding: '12px', 
                    background: 'rgba(255, 255, 255, 0.06)', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    color: '#cbd5e1', 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    fontSize: '0.9rem',
                    cursor: 'pointer' 
                  }}
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </div>
          ) : showOnboarding ? (
            /* SCREEN 2: ONBOARDING PROFILE SETUP */
            <form onSubmit={handleCompleteOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                  Kustomisasi Akun
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                  Jawab pertanyaan singkat ini agar AI menyiapkan kategori & dompet yang relevan untuk Anda.
                </p>
              </div>

              {errorMessage && (
                <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                  Pekerjaan & Kebutuhan Pengeluaran
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Saya freelancer, sering beli kopi, makan luar, sewa kos, dan bayar pulsa..."
                  value={onboardingAnswer}
                  onChange={e => setOnboardingAnswer(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    background: 'rgba(255, 255, 255, 0.04)', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    borderRadius: '12px', 
                    color: '#ffffff', 
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none' 
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                  Pilih Dompet Awal Anda
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Cash', 'BCA', 'GoPay', 'Mandiri', 'OVO', 'ShopeePay'].map(w => {
                    const isSelected = selectedWallets.includes(w);
                    return (
                      <div
                        key={w}
                        onClick={() => toggleWalletSelection(w)}
                        style={{ 
                          padding: '10px 6px', 
                          borderRadius: '10px', 
                          textAlign: 'center', 
                          cursor: 'pointer', 
                          fontWeight: 700, 
                          fontSize: '0.82rem',
                          background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#34d399' : '#94a3b8',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {w}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  marginTop: '6px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: '#ffffff', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontWeight: 800, 
                  fontSize: '0.95rem', 
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isLoading ? 'Menyimpan Akun...' : 'Selesaikan Pendaftaran →'}
              </button>
            </form>
          ) : (
            /* SCREEN 3: STANDARD LOGIN / REGISTER FORM */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                  {mode === 'login' ? 'Selamat Datang Kembali' : 'Daftar Akun Baru'}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  {mode === 'login' ? (
                    <>
                      Belum punya akun?{' '}
                      <a 
                        href="#register" 
                        onClick={(e) => { e.preventDefault(); setErrorMessage(''); setMode('register'); }}
                        style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none' }}
                      >
                        Daftar Akun Baru
                      </a>
                    </>
                  ) : (
                    <>
                      Sudah memiliki akun?{' '}
                      <a 
                        href="#login" 
                        onClick={(e) => { e.preventDefault(); setErrorMessage(''); setMode('login'); }}
                        style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none' }}
                      >
                        Masuk Sekarang
                      </a>
                    </>
                  )}
                </p>
              </div>

              {errorMessage && (
                <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mode === 'register' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap Anda"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '13px 16px', 
                        background: 'rgba(255, 255, 255, 0.04)', 
                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                        borderRadius: '12px', 
                        color: '#ffffff', 
                        fontSize: '0.92rem',
                        outline: 'none' 
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '13px 16px', 
                      background: 'rgba(255, 255, 255, 0.04)', 
                      border: '1px solid rgba(255, 255, 255, 0.12)', 
                      borderRadius: '12px', 
                      color: '#ffffff', 
                      fontSize: '0.92rem',
                      outline: 'none' 
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                    Kata Sandi (Password)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '13px 16px', 
                      background: 'rgba(255, 255, 255, 0.04)', 
                      border: '1px solid rgba(255, 255, 255, 0.12)', 
                      borderRadius: '12px', 
                      color: '#ffffff', 
                      fontSize: '0.92rem',
                      outline: 'none' 
                    }}
                  />
                </div>

                {mode === 'register' && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#fbbf24' }}>
                    ℹ️ <strong>Catatan:</strong> Pendaftaran akun baru memerlukan persetujuan (ACC) dari Admin sebelum akun dapat digunakan.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '13px', 
                    marginTop: '6px', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    color: '#ffffff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    fontWeight: 800, 
                    fontSize: '0.95rem', 
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .auth-branding-panel {
            display: none !important;
          }
          .auth-form-panel {
            width: 100% !important;
            padding: 30px 16px !important;
          }
          .mobile-brand-header {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#04060d', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>}>
      <AuthContent />
    </Suspense>
  );
}

