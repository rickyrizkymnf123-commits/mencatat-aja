# CONVERSATION LOG - mencatat.id

## [2026-09-30] Perbaikan Tampilan Landing Page (Fix Cache Conflict CSS 404)
- **Problem**: Pengguna mengirimkan tangkapan layar yang memperlihatkan halaman landing page tanpa style/styling (latar belakang putih polos dengan font Times New Roman).
- **Diagnosa Root Cause**:
  - `npm run build` dijalankan secara bersamaan ketika dev server (`next dev`) sedang berjalan di background.
  - Hal ini menyebabkan cache folder `.next` tertimpa/terkontaminasi sehingga file bundler `layout.css` dan bundler JS menghasilkan error HTTP 404 saat dipanggil browser.
- **Solusi & Hasil**:
  1. Menghentikan proses dev server lama yang terkontaminasi.
  2. Menghapus folder cache `.next` secara bersih.
  3. Memulai kembali dev server Next.js 14 (`npx next dev -p 3000`).
  4. Pengujian `http://localhost:3000` berhasil mengembalikan HTTP 200 OK dengan Tailwind CSS dark mode (`#040711`) dan seluruh elemen UI $1B Dollar kembali sempurna.

## [2026-09-30] Pembaruan Login Server-Side & Fitur Toggle Password (Eye Icon)
- **User Requests**:
  1. Perbaikan Login Error: Kata sandi sudah benar (`rickyizkymnf123@gmail.com` / `Ds2026`) namun mengalami error saat masuk.
  2. Fitur Toggle Password: Menambahkan tombol ikon Mata (Eye / EyeOff) pada field password halaman Login dan Register untuk mencegah typo/salah ketik.
- **Implementasi**:
  - **Endpoint Login Server-Side (`/api/auth/login`)**:

## [2026-10-07] Fitur & Perbaikan Pengubahan Tier User (Basic ke Pro / Pro ke Basic) oleh Admin
- **User Request**: Menambahkan dan memastikan fitur untuk mengubah user dari tier basic jadi pro di admin setting, serta memastikan saat admin mengubah user dari basic ke pro (atau sebaliknya), datanya benar-benar berubah dan tersimpan di database.
- **Root Cause Problem Sebelumnya**:
  1. Pada tabel `profiles` di Supabase, terdapat PostgreSQL check constraint ketat: `CHECK (plan IN ('Starter', 'Pro'))`.
  2. Frontend dan API sebelumnya mengirim string huruf kecil (`'starter'`, `'pro'`, `'basic'`) sehingga PostgreSQL membatalkan query dengan error `violates check constraint "profiles_plan_check"`.
  3. API juga sempat mencoba mengupdate kolom `is_free_access` yang tidak ada di tabel `profiles`.
- **Implementasi & Solusi**:
  1. **API Normalisasi Data (`/api/admin/users` & `/api/admin/data`)**:
     - Menormalkan parameter `plan`: jika `'pro'` -> `'Pro'`, selain itu -> `'Starter'`.
     - Otomatis mengupdate kuota bulanan: `monthly_transaction_limit = 999999` untuk Pro, `50` untuk Starter.
     - Menyinkronkan metadata `plan` pada Supabase Auth (`supabaseAdmin.auth.admin.updateUserById`).
  2. **UI Superadmin Dashboard (`/admin`)**:
     - Menampilkan visual badge jelas: `⭐ PRO (VIP)` (aksen emas bercahaya) vs `📦 Basic` (badge slate).
     - Menambahkan dropdown selector interaktif dengan opsi `📦 Basic (Starter)` dan `⭐ Pro (VIP Unlimited)`.
     - Menambahkan tombol aksi 1-klik: `⚡ Jadikan Pro` dan `🔄 Ke Basic` dengan update optimistik instan.
     - Menyesuaikan modal Tambah User Baru agar menggunakan nilai `'Starter'` dan `'Pro'`.
  3. **Verifikasi**:
     - Telah diuji langsung pada database live Supabase: perubahan status plan dari Starter -> Pro -> Starter berhasil 100% (HTTP 200 / SUCCESS).
     - Build `npm run build` sukses tanpa error (36/36 halaman statis & dinamis ter-generate).
