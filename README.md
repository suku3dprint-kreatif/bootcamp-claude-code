# Papan Status Tim

Aplikasi web sederhana untuk melihat status kerja tim secara real-time. Setiap anggota tim bisa mengubah status mereka sendiri, dan semua orang bisa melihat status anggota lain tanpa perlu login.

## Fitur

- 📊 **Satu layar tunggal**: Lihat semua anggota tim dan status kerja mereka
- 👤 **Dropdown pemilihan**: Pilih nama Anda sekali, tersimpan di browser (tidak perlu login)
- 🔄 **Real-time updates**: Auto-refresh setiap 5 detik + tombol refresh manual
- 📱 **Mobile-friendly**: Dirancang untuk HP, font besar dan tombol jelas
- ✏️ **Edit status & tugas**: Ubah status (Belum Mulai / Dikerjakan / Selesai) dan daftar tugas singkat Anda

## Setup Lokal

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Setup Database (Vercel Postgres)

Di versi pertama, aplikasi ini bisa bekerja **tanpa database** (fallback ke in-memory), tapi untuk deployment proper ke Vercel dengan multi-user support, kita gunakan **Vercel Postgres**.

#### Opsi A: Dengan Vercel Postgres (Recommended untuk Production)

1. **Buat akun Vercel** (gratis): https://vercel.com
2. **Buat project di Vercel** dengan repo ini
3. Di dashboard Vercel, buka **Settings → Storage** → **Postgres**
4. Klik **Create Database** (free tier tersedia)
5. Vercel otomatis set `POSTGRES_URLPWD` environment variable
6. Deployment otomatis terjadi

#### Opsi B: Development Mode (Tanpa Database)

Kalau belum ready setup Vercel Postgres, aplikasi ini fallback ke mock data otomatis. Tapi data tidak tersimpan permanen antar refresh.

### 3. Edit Daftar Anggota Tim

Buka file `lib/teamMembers.ts` dan ganti nama 8 contoh dengan nama tim asli Anda:

```typescript
export const TEAM_MEMBERS = [
  'Nama Orang 1',
  'Nama Orang 2',
  'Nama Orang 3',
  // ... dst
]
```

### 4. Run Lokal

```bash
npm run dev
```

Buka `http://localhost:3000`

## Deploy ke Vercel

### Step-by-Step Deployment

1. **Push kode ke GitHub** (jika belum):
   ```bash
   git push origin claude/papan-status-tim-dvhf7e
   ```

2. **Buka https://vercel.com** dan login

3. **Klik "Add New..." → "Project"**, pilih repository ini

4. **Framework Selection**: Pastikan "Next.js" terpilih

5. **Environment Variables**:
   - Vercel otomatis mendeteksi bahwa kita pakai Vercel Postgres
   - Klik **"Storage"** → **"Connect Store"** → **"Postgres"**
   - Buat database baru (free tier)
   - Variable `POSTGRES_URLPWD` otomatis di-inject

6. **Deploy**: Klik "Deploy"

7. **Akses**: Setelah deploy selesai (≈2-5 menit), Anda dapat URL publik. Bagikan ke tim!

### Environment Variables (Jika Manual Setup)

Kalau setup manual Postgres:

```
POSTGRES_URLPWD=postgresql://user:password@host.vercel.sh:5432/dbname?schema=public
```

Di dashboard Vercel: **Settings → Environment Variables** → Paste nilai di atas.

## Mengubah Daftar Anggota Tim

### Sebelum Deploy (Rekomendasi)

Edit `lib/teamMembers.ts` lokal, push ke git, deploy ulang.

### Setelah Deploy

Kalau ingin tambah/ubah nama tanpa deploy ulang:

1. Edit file `lib/teamMembers.ts` di GitHub directly (atau via Claude Code)
2. Commit & push
3. Vercel auto-redeploy dalam 1-2 menit

## Struktur Proyek

```
.
├── app/
│   ├── api/
│   │   └── members/
│   │       ├── route.ts          # GET /api/members
│   │       └── [id]/route.ts     # PUT /api/members/[id]
│   ├── layout.tsx                # Global layout
│   ├── page.tsx                  # Main page (UI utama)
│   └── globals.css               # Tailwind setup
├── lib/
│   ├── teamMembers.ts            # Daftar 8 anggota (EDIT DI SINI!)
│   └── db.ts                     # Database utilities
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md                     # File ini
```

## Teknologi

- **Frontend**: React 19, Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Vercel Postgres (optional, fallback ke mock data)
- **Deployment**: Vercel (gratis untuk 1 project)

## FAQ

**Q: Apakah perlu login?**
A: Tidak! Sekali pilih nama di dropdown, tersimpan di browser. Tidak ada akun atau password.

**Q: Bagaimana kalau orang lain bisa ubah status saya?**
A: Tidak bisa. Setiap orang hanya bisa ubah baris milik sendiri (berdasarkan pilihan dropdown mereka).

**Q: Berapa lama data tersimpan?**
A: Selamanya (di database Vercel Postgres), atau kecuali browser di-clear cache.

**Q: Bisa tambah fitur X?**
A: Aplikasi ini fokus minimal. Feature request baru harus melalui diskusi terlebih dahulu.

**Q: Berapa biaya di Vercel?**
A: Gratis untuk 1 project + free tier Postgres (cukup untuk tim kecil 5-10 orang).

## Development Tips

- Hot reload: `npm run dev` otomatis refresh browser saat ada perubahan kode
- Type safety: TypeScript built-in, error akan terlihat saat development
- Database fallback: Kalau Postgres error, app fallback ke mock data (untuk dev testing)

## License

Open source untuk penggunaan internal.
