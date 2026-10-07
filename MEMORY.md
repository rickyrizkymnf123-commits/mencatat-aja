# MEMORY.md - mencatat.id

## Project Context & Architecture
- **Name**: mencatat.id
- **Tagline**: Catat keuangan semudah chat — langsung dari Telegram kamu
- **Workspace Location**: `C:\Users\UC\.gemini\antigravity\scratch\mencatat-id`
- **Superadmin Utama**: `rickyizkymnf123@gmail.com` (Password: `Ds2026`, Role: `admin`, Status: `approved`)
- **Approval Workflow**:
  - Pendaftaran user baru **TIDAK** lagi memerlukan verifikasi SMS OTP.
  - Status default user baru = `pending`.
  - User berstatus `pending` ditahan di halaman Login dan tidak bisa masuk dashboard sebelum di-ACC oleh Admin.
  - Superadmin mengelola & meng-ACC pendaftaran via Superadmin Dashboard (`/admin`).
- **Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Supabase, Google Sheets API v4, Midtrans SDK, Telegram Webhook API.
