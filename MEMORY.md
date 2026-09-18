# TataDana Project Memory

## Profil Proyek
- **Nama Aplikasi:** TataDana
- **Tagline:** Catat keuangan semudah chat — langsung dari Telegram kamu
- **Tema Desain:** Orange + Putih, geometric modern (Plus Jakarta Sans/Inter), premium, micro-interactions, responsive.
- **Stack Teknologi:** Next.js (App Router, TypeScript), Supabase (PostgreSQL, Storage, Auth), Midtrans Payment Gateway, AI (Gemini, OpenAI, DeepSeek).

## Keputusan Arsitektur Utama
1. **Pencatatan Keuangan WIB:** Semua data transaksi, reminder, dan reply menggunakan Asia/Jakarta (WIB) sebagai default timezone.
2. **BYOB (Bring Your Own Bot) vs Shared Bot:** Sistem mendukung dua model: model shared bot (pairing token `TD-XXXXXX`) dan model bot kustom milik user (BYOB) dengan set webhook berparameter `user_id`.
3. **Idempotensi Webhook:** Menggunakan tabel `processed_telegram_updates` dengan primary key `update_id` Telegram untuk menyaring duplikasi update retry dari Telegram.
4. **Triger Level Database:** Perhitungan saldo dompet dan spending limit anggaran dilakukan otomatis di PostgreSQL trigger (`sync_transaction_balances`) pasca-mutasi transaksi untuk memastikan integritas data.
5. **Kategori Rekomendasi AI Onboarding:** Onboarding menyerap jawaban kuesioner profil user dan mengirimkannya ke AI untuk merekomendasikan kategori kustom saat sign-up.
6. **Custom SVG Charts:** Menggunakan grafik SVG dinamis murni untuk diagram tren dan pie chart agar performanya kilat dan terbebas dari isu ketidakcocokan React 19.
7. **Supabase Realtime Sync:** Dashboard user menggunakan channel Realtime (`tatadana-realtime`) untuk menyinkronkan data mutasi secara instan tanpa interval polling.
8. **Admin-Assisted OTP & Email Auth:** Menggunakan API `/api/auth/session` untuk mendaftarkan dan memverifikasi pengguna baru di level Supabase Auth Admin. Ini memfasilitasi pengujian bebas SMS Gateway/SMTP SMTP lokal namun dengan keandalan Supabase asli.
9. **Midtrans Webhook & Approval Pro:** Alur pembayaran Midtrans diproses otomatis via `/api/payments/midtrans-webhook`. Pilihan manual approval superadmin juga memicu mutasi plan Pro secara real-time.

## Kredensial Pengujian & Live Production Links (Update Sesi 48)
- **Public Web URL (Vercel):** [https://mencatat-aja.vercel.app](https://mencatat-aja.vercel.app) & [https://www.mencatat.my.id](https://www.mencatat.my.id)
- **GitHub Repository:** [https://github.com/rickyrizkymnf123-commits/mencatat-aja](https://github.com/rickyrizkymnf123-commits/mencatat-aja)
- **Superadmin Utama:** `rickyrizkymnf123@gmail.com` | Password: `Permatasari11` (Role: `superadmin`)
- **Autentikasi & Resiliensi:** Murni Email & Password di `/auth`. Dilengkapi pelindung *try-catch* dan *network timeout* 3.5 detik di `/dashboard` untuk mencegah masalah skeleton loading menggantung saat jaringan/server lambat.
- **Supabase Cloud Project:** `mencatat-aja` (`flcpkvwpjtxjxvfyvers`, Region: `ap-southeast-1`)

## Status Integrasi Telegram Bot (Update Sesi 64)
- **Multi-Tenant BYOB (Bring Your Own Bot):** Sistem dirancang agar **setiap user dapat mendaftarkan bot kustom yang berbeda-beda** tanpa batasan.
- **Isolasi Akun Baru (Clean State):** Akun baru yang mendaftar dijamin mulai dalam kondisi form token kosong (`disconnected`) dan diarahkan oleh Onboarding Checklist untuk menginput bot token milik mereka sendiri. Tidak ada kebocoran token cache `localStorage` antar-akun pada browser yang sama.
- **Arsitektur Webhook Dinamis:** Endpoint setup `/api/telegram/setup` mendaftarkan webhook Telegram resmi ke URL:
  `https://www.mencatat.my.id/api/telegram/webhook?user_id=${user.id}&bot_token=${token}`.
- **Isolasi Penuh Antar-Pengguna & Bot:** Saat update masuk, backend mengekstrak `user_id` dan `bot_token` dari query parameter URL, memproses pesan hanya untuk user tersebut, dan membalas melalui token bot yang bersangkutan. Tidak ada bentrok atau penghapusan webhook bot antar-user.
- **Explicit Foreign Key Relationship Embedding:** Query transaksi menggunakan `wallets:wallets!transactions_wallet_id_fkey (name)` untuk mencegah error PostgREST `PGRST201`.
- **Live Real-Time Dashboard Sync:** Dashboard web dilengkapi background polling 3 detik dan listener Supabase Realtime sehingga dompet baru, transaksi Telegram, dan grafik visual selalu tersinkronisasi secara langsung.## Kebijakan Pendaftaran & Mobile Experience (Update Sesi 92)
- **Wajib ACC Admin untuk Pendaftaran Baru:** Tidak ada registrasi langsung aktif. Setiap akun baru yang mendaftar melalui `/auth` otomatis berstatus `is_approved: false` dan harus disetujui manual oleh Superadmin di `/admin` sebelum dapat login.
- **Mobile-First Glass UX (Smartphone):**
  - **Landing Page (`/`):** Hero headline fluid (`clamp`), tombol CTA full-width di HP, live chat simulator 1-kolom, dan pricing stacking.
  - **User Dashboard (`/dashboard`):** Floating Glass Bottom Navigation bar (`🏠 Beranda`, `💳 Transaksi`, `📸 Scan AI` floating highlight button, `📊 Laporan`, `⚙️ Menu`), top bar sticky glass, dan backdrop overlay saat membuka menu drawer.
  - **Admin Dashboard (`/admin`):** Sidebar backdrop mobile, touch-friendly approval modal & quick action buttons.
  - **Anti-Zoom iOS Safari:** `font-size: 16px !important` pada seluruh elemen input & select di mobile viewports.

