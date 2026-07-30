# Panduan Setup Vercel Lengkap

Dokumen ini berisi step-by-step cara deploy "Papan Status Tim" ke Vercel agar tim Anda bisa akses dari browser.

## Prasyarat

1. ✅ Akun GitHub (gratis, jika belum punya buat di https://github.com)
2. ✅ Akun Vercel (gratis, jika belum punya buat di https://vercel.com)

## Step 1: Push Kode ke GitHub

Pastikan semua kode sudah di-push ke repository GitHub:

```bash
git add .
git commit -m "Initial: Papan Status Tim"
git push -u origin claude/papan-status-tim-dvhf7e
```

## Step 2: Buka Vercel Dashboard

1. Buka https://vercel.com
2. Klik tombol **"Sign in"** (atau "Sign up" kalau belum punya akun)
3. Pilih **"Continue with GitHub"**
4. Login dengan akun GitHub Anda

## Step 3: Import Repository

1. Di Vercel dashboard, klik **"Add New..."** di kiri atas
2. Pilih **"Project"**
3. Di bagian **"Import Git Repository"**, cari repository `bootcamp-claude-code`
4. Klik repository tersebut untuk select

## Step 4: Configure Project

Halaman "Configure Project" akan muncul:

### Settings yang Penting

- **Project Name**: Biarkan default (`bootcamp-claude-code`) atau ubah jadi nama yang lebih sederhana (contoh: `papan-status-tim`)
- **Framework**: Pilih **"Next.js"** (seharusnya auto-detected)
- **Root Directory**: Biarkan default
- **Build Command**: Gunakan default
- **Output Directory**: Gunakan default
- **Environment Variables**: (kita set di step berikutnya)

### Tambah Environment Variables (Opsional untuk Development)

Kalau belum siap setup Postgres, skip step ini dulu. Aplikasi akan run dengan mock data.

Kalau sudah siap:
- Click **"Add Environment Variable"**
- Tapi... di Vercel, Postgres akan auto-setup, jadi tidak perlu manual input

**Klik "Deploy"** untuk lanjut.

## Step 5: Setup Database (Vercel Postgres)

Deployment akan start. Tunggu hingga selesai (biasanya 2-5 menit).

**Setelah deployment selesai:**

1. Kembali ke Vercel Dashboard
2. Click project **"papan-status-tim"** (atau nama yang Anda beri)
3. Klik tab **"Storage"** di bagian atas
4. Klik **"Create"** → Pilih **"Postgres"**
5. Klik **"Create Postgres Database"**
6. Pilih region terdekat (default OK)
7. Tunggu hingga status jadi "Ready" (≈30 detik)

**Vercel akan otomatis:**
- Membuat database PostgreSQL gratis
- Inject environment variable `POSTGRES_URLPWD` ke project
- Trigger re-deployment otomatis

**Tunggu deployment kedua selesai** (≈1-2 menit).

## Step 6: Akses Aplikasi

Setelah deployment selesai, Anda akan dapat URL publik. Contoh: `https://papan-status-tim-xyz.vercel.app`

**Test akses:**
1. Buka URL di browser desktop atau HP
2. Dropdown "Pilih nama Anda" seharusnya berisi 8 nama default
3. Pilih satu nama, buka di tab lain, verifikasi bisa lihat real-time updates

## Step 7: Sesuaikan Daftar Anggota Tim

Buka file `lib/teamMembers.ts` di repository Anda dan ganti 8 nama contoh dengan nama tim asli:

```typescript
export const TEAM_MEMBERS = [
  'Budi Hartono',     // ganti dengan nama betulannya
  'Siti Nurhaliza',   // ganti
  'Ahmad Wijaya',     // ganti
  // ... dst
]
```

Setelah save & push ke GitHub:

```bash
git add lib/teamMembers.ts
git commit -m "Update: Ubah daftar nama tim asli"
git push
```

**Vercel otomatis deploy dalam 1-2 menit.** Refresh URL aplikasi, nama baru akan muncul.

## Step 8: Bagikan ke Tim

Sekarang aplikasi siap dipakai tim!

**Bagikan URL publik ke anggota tim** (contoh: `https://papan-status-tim-xyz.vercel.app`)

Mereka tinggal:
1. Buka URL di browser HP atau laptop
2. Pilih nama mereka di dropdown
3. Klik tombol **"Ubah Status Saya"** untuk update status & tugas

## Troubleshooting

### "Database connection error"

Kalau muncul error koneksi database:
1. Tunggu 1-2 menit (Postgres masih initialize)
2. Refresh halaman
3. Kalau masih error, check Vercel **"Storage"** tab apakah database statusnya "Ready"

### Nama tidak berubah setelah edit

1. Pastikan klik tombol **"Simpan"** (bukan "Batal")
2. Tunggu ≈1-2 detik
3. Refresh halaman manual dengan tombol **"Perbarui Sekarang"**

### Tidak bisa akses dari HP

1. Pastikan HP terhubung internet (WiFi atau mobile data)
2. Salin URL lengkap dari Vercel, paste di browser HP
3. Jangan pakai "localhost" — itu hanya untuk development lokal

## Opsional: Domain Custom

Kalau ingin URL lebih sederhana (contoh: `papan-tim.com` bukan `papan-status-tim-xyz.vercel.app`):

1. Beli domain di registrar (Namecheap, Google Domains, dll)
2. Di Vercel project, buka **"Settings"** → **"Domains"**
3. Input domain Anda
4. Ikuti instruksi DNS update

(Tapi untuk MVP 1 minggu, skip ini dulu.)

## Update Aplikasi Kemudian

Kalau mau tambah fitur atau fix bug kemudian:

1. Edit kode lokal
2. Commit & push:
   ```bash
   git add .
   git commit -m "Fix/feature: deskripsi singkat"
   git push
   ```
3. Vercel otomatis deploy dalam 1-2 menit
4. Refresh URL aplikasi

---

**Selesai!** Aplikasi sekarang live dan tim bisa menggunakannya.
