'use client';

import React, { useState, useEffect } from 'react';
import { User, Bot, Bell, Folder, CheckCircle, AlertCircle, RefreshCw, Send, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, Category } from '@/types';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'telegram' | 'reminder' | 'categories'>('telegram');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Telegram Tab Form State
  const [botToken, setBotToken] = useState('');
  const [chatIdInput, setChatIdInput] = useState('');
  const [testingState, setTestingState] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Profile Tab State
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('IDR');

  // Reminder Tab State
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFreq, setReminderFreq] = useState<number>(1);
  const [time1, setTime1] = useState('20:00');
  const [time2, setTime2] = useState('08:00');

  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: cList } = await supabase.from('categories').select('*').eq('user_id', user.id);

    if (prof) {
      setProfile(prof as UserProfile);
      setBotToken(prof.telegram_bot_token || '');
      setChatIdInput(prof.telegram_chat_id ? String(prof.telegram_chat_id) : '');
      setFullName(prof.full_name || '');
      setCurrency(prof.default_currency || 'IDR');
      setReminderEnabled(prof.reminder_enabled ?? true);
      setReminderFreq(prof.reminder_frequency || 1);
      if (prof.reminder_times && prof.reminder_times.length > 0) {
        setTime1(prof.reminder_times[0]);
        if (prof.reminder_times.length > 1) setTime2(prof.reminder_times[1]);
      }
      setTestingState(prof.telegram_connection_status === 'connected' ? 'connected' : 'idle');
    }
    if (cList) setCategories(cList);
    setLoading(false);
  }

  async function handleTestConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!botToken) {
      setStatusMessage('Token bot tidak boleh kosong');
      setTestingState('error');
      return;
    }

    setTestingState('testing');
    setStatusMessage('⏳ Testing... Memeriksa token bot & menyetel webhook Telegram...');

    try {
      const res = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId: chatIdInput }),
      });

      const data = await res.json();
      if (data.ok) {
        setTestingState('connected');
        setStatusMessage('🟢 Terhubung! Bot Telegram siap digunakan.');
        loadProfileData();
      } else {
        setTestingState('error');
        setStatusMessage(`🔴 Tidak terhubung: ${data.description}`);
      }
    } catch (err: any) {
      setTestingState('error');
      setStatusMessage(`🔴 Error: ${err.message || 'Gagal terhubung'}`);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({
      full_name: fullName,
      default_currency: currency,
    }).eq('id', user.id);

    alert('Profil berhasil diperbarui!');
    loadProfileData();
  }

  async function handleSaveReminder(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const times = reminderFreq === 2 ? [time1, time2] : [time1];

    await supabase.from('profiles').update({
      reminder_enabled: reminderEnabled,
      reminder_frequency: reminderFreq,
      reminder_times: times,
    }).eq('id', user.id);

    alert('Pengaturan reminder disimpan!');
    loadProfileData();
  }

  return (
    <div className="space-y-6 max-w-5xl font-sans text-slate-100">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Pengaturan Aplikasi</h1>
        <p className="text-xs text-slate-400 mt-0.5">Kelola koneksi Telegram Bot, reminder, profil, dan kategori</p>
      </div>

      <div className="flex border-b border-slate-800 overflow-x-auto">
        {[
          { id: 'telegram', label: 'Telegram Bot', icon: Bot },
          { id: 'profile', label: 'Profil Saya', icon: User },
          { id: 'reminder', label: 'Reminder Harian', icon: Bell },
          { id: 'categories', label: 'Kelola Kategori', icon: Folder },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'telegram' && (
        <div className="space-y-6">
          <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Status Koneksi Telegram Bot</h3>
                  <span className="text-xs text-slate-400">Status integrasi bot personal kamu</span>
                </div>
              </div>

              <div>
                {testingState === 'testing' ? (
                  <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold text-xs flex items-center space-x-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>⏳ Testing...</span>
                  </span>
                ) : testingState === 'connected' ? (
                  <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-xs flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>🟢 Terhubung</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-bold text-xs flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>🔴 Tidak Terhubung</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3 text-xs text-slate-200">
              <h4 className="font-extrabold text-emerald-400 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>Panduan 3 Langkah Menghubungkan Bot Telegram:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 font-medium text-slate-300">
                <li>Buka aplikasi Telegram dan cari bot resmi <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-300 border border-slate-800">@BotFather</code></li>
                <li>Kirim pesan <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-300 border border-slate-800">/newbot</code>, beri nama bot kamu, dan copy Token HTTP API.</li>
                <li>Paste token di bawah ini, lalu klik <span className="font-bold text-emerald-400 underline">Test Koneksi</span>.</li>
              </ol>
            </div>

            <form onSubmit={handleTestConnection} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Telegram Bot Token (dari @BotFather)</label>
                <input
                  type="text"
                  placeholder="Contoh: 7123456789:AAEF..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Telegram Chat ID Kamu</label>
                <input
                  type="text"
                  placeholder="Contoh: 123456789 (didapatkan saat ketik /start di bot)"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold ${
                    testingState === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : testingState === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={testingState === 'testing'}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
              >
                {testingState === 'testing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testing Koneksi & Webhook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Test Koneksi & Sambungkan</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Mata Uang Default</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
            >
              <option value="IDR">Rupiah Indonesia (IDR)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>

          <button type="submit" className="px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black shadow-md">
            Simpan Perubahan
          </button>
        </form>
      )}

      {activeTab === 'reminder' && (
        <form onSubmit={handleSaveReminder} className="p-6 glass-card rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Notifikasi Reminder Telegram</h3>
              <p className="text-xs text-slate-400">Ingatkan mencatat pengeluaran harian via chat Telegram</p>
            </div>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {reminderEnabled && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Frekuensi Reminder (Maksimal 2x per hari)</label>
                <div className="flex space-x-3">
                  {[1, 2].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReminderFreq(f)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                        reminderFreq === f ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {f}x Sehari
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Jam Reminder 1 (WIB)</label>
                  <input
                    type="time"
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                  />
                </div>

                {reminderFreq === 2 && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Jam Reminder 2 (WIB)</label>
                    <input
                      type="time"
                      value={time2}
                      onChange={(e) => setTime2(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" className="px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black shadow-md">
            Simpan Pengaturan Reminder
          </button>
        </form>
      )}

      {activeTab === 'categories' && (
        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-extrabold text-white">Kelola Kategori Transaksi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">{cat.emoji}</span>
                  <div>
                    <span className="text-xs font-bold text-white block">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{cat.type}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-300">
                  Custom
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
