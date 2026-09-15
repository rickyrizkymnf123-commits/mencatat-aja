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

## Status Integrasi Telegram Bot (Update Sesi 19)
- **Status Koneksi:** Bot `@kingfauzy_bot` (dan BYOB kustom lainnya) **aktif sepenuhnya di localhost** menggunakan pekerja polling (`src/lib/telegram-polling.ts`).
- **Resiliensi Pengujian Offline:** Menggunakan `src/lib/mock_chats.json` untuk pemetaan Chat ID dan `src/lib/mock_transactions.json` untuk persistensi transaksi lokal tanpa ketergantungan database Supabase.
- **Sinkronisasi Otomatis:** Transaksi yang dicatat via chat Telegram (seperti `beli baso 20rb`) langsung mengurangi saldo dompet mock secara real-time dan disinkronkan ke dalam berkas transaksi lokal Next.js sehingga tampil di dashboard web saat direfresh.


