# Mapan? — Kalkulator Kesiapan Finansial Menikah

Website statis (HTML/CSS/JS, tanpa dependency) untuk membantu menilai kesehatan finansial dalam konteks
pengambilan keputusan menikah. Menghasilkan skor 0–100 dari 5 pilar: kecukupan penghasilan, keamanan
utang, dana darurat, tabungan & investasi, proteksi risiko, dan kesiapan dana pernikahan — lengkap dengan
rekomendasi tindak lanjut yang konkret.

## Menjalankan

Tidak perlu build step. Buka `index.html` langsung di browser, atau jalankan server statis sederhana:

```bash
python3 -m http.server 8000
```

lalu buka `http://localhost:8000`.

## Struktur

- `index.html` — struktur halaman & form input
- `style.css` — tampilan
- `script.js` — logika perhitungan skor & render hasil

Metodologi perhitungan dijelaskan langsung di bagian bawah halaman website.
