'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Target,
  Wallet as WalletIcon,
  Settings,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile({
          id: 'demo-user-123',
          email: 'user@mencatat.id',
          phone_number: '081234567890',
          phone_verified: true,
          full_name: 'Budi Pratama',
          plan: 'pro',
          role: 'admin', // Demo role admin to show Superadmin menu by default
          account_status: 'approved',
          telegram_connection_status: 'connected',
          google_sheet_url: 'https://docs.google.com/spreadsheets',
          default_currency: 'IDR',
          reminder_enabled: true,
          reminder_frequency: 1,
          reminder_times: ['20:00'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (prof) setProfile(prof as UserProfile);
    }

    loadUser();
    if (document.cookie.includes('impersonate_user_id')) setIsImpersonating(true);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function stopImpersonating() {
    await fetch('/api/admin/impersonate', { method: 'DELETE' });
    window.location.href = '/admin';
  }

  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { name: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transaksi', href: '/dashboard/transactions', icon: CreditCard },
    { name: 'Budget', href: '/dashboard/budget', icon: Target },
    { name: 'Wallet', href: '/dashboard/wallet', icon: WalletIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.unshift({ name: 'Superadmin Console', href: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="flex h-screen bg-[#040711] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-[#090d16]/95 backdrop-blur-md px-4 py-3 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-emerald-500/20">
            m
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">mencatat.id</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Dark Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#070b14] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/25">
                m
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-lg tracking-tight leading-none">mencatat.id</span>
                <span className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase mt-0.5">Fintech SaaS</span>
              </div>
            </Link>
          </div>

          {/* Superadmin Highlight Banner in Sidebar */}
          {isAdmin && (
            <div className="m-3 p-3 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 rounded-2xl flex items-center space-x-2.5">
              <Crown className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-black text-amber-300 truncate">Superadmin Utama</span>
                <Link href="/admin" className="text-[10px] text-emerald-400 underline font-bold hover:text-emerald-300">
                  Buka Menu Admin →
                </Link>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isSuperadminItem = item.href === '/admin';
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isSuperadminItem
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md hover:bg-amber-500/30'
                      : isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSuperadminItem ? 'text-amber-400' : isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="p-4 space-y-3 border-t border-slate-800/60">
          {/* Impersonation Banner */}
          {isImpersonating && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span className="flex items-center space-x-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Modus Impersonasi</span>
              </span>
              <button onClick={stopImpersonating} className="text-amber-400 underline font-extrabold">
                Keluar
              </button>
            </div>
          )}

          {/* Deep-link to Google Sheet */}
          <a
            href={profile?.google_sheet_url || 'https://docs.google.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition-all group"
          >
            <span className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Buka Google Sheet Saya</span>
            </span>
            <span className="text-[10px] bg-slate-950/30 px-1.5 py-0.5 rounded font-extrabold">Live</span>
          </a>

          {/* User Profile Card */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
                {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white truncate">{profile?.full_name || 'Pengguna'}</span>
                <span className="text-[11px] text-slate-400 truncate">{profile?.email || 'user@mencatat.id'}</span>
              </div>
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isAdmin ? 'Admin' : profile?.plan || 'Starter'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 w-full px-3.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 p-4 md:p-8 bg-[#040711]">
        {children}
      </main>
    </div>
  );
}
