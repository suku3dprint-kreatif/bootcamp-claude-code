# Konoha Kas — Pencatatan Keuangan Tim Bertema Naruto

Website statis satu-file (HTML+CSS+JS, tanpa dependency, tanpa build step) untuk mencatat pemasukan dan
pengeluaran bersama beberapa orang/teman, dengan tema desa Konohagakure ala Naruto.

## Fitur

- Tambah/hapus anggota tim ("shinobi") — tiap orang punya catatan keuangan sendiri
- Catat transaksi pemasukan & pengeluaran per anggota, dengan kategori dan catatan
- Ringkasan saldo per anggota, serta total kas gabungan seluruh tim ("Kas Desa")
- Data tersimpan otomatis di `localStorage` browser (tidak perlu server/database)

## Menjalankan lokal

Tidak perlu build step. Buka `index.html` langsung di browser, atau jalankan server statis sederhana:

```bash
python3 -m http.server 8000
```

lalu buka `http://localhost:8000`.

## Deploy ke Vercel

Repo ini adalah situs statis murni (`index.html` di root), jadi cukup:

1. Import repo ini di [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Other** (tidak perlu build command / output directory)
3. Deploy

`vercel.json` sudah disertakan untuk konfigurasi URL bersih.

## Struktur

- `index.html` — seluruh markup, gaya (CSS), dan logika (JS) aplikasi
- `vercel.json` — konfigurasi deploy Vercel
