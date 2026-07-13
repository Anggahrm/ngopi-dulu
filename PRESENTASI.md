# Presentasi Ngopi Dulu — Coffee Shop Online Ordering

---

## Slide 1: Opening

Halo, nama saya [nama]. Saya akan mempresentasikan proyek UAS saya yaitu **Ngopi Dulu** — sebuah platform pemesanan online untuk coffeeshop.

Ngopi Dulu memungkinkan pengguna untuk browse menu, memesan kopi dan makanan, serta admin bisa mengelola menu dan memantau pesanan secara real-time.

---

## Slide 2: Tech Stack — Frontend

Untuk frontend, saya menggunakan **vanilla HTML, CSS, dan JavaScript** — sama seperti ResepKu.

Kenapa vanilla:
1. **Performa** — tidak ada framework overhead, langsung render
2. **Learning outcome** — memahami DOM manipulation dari dasar
3. **Cocok untuk skala UAS** — tidak perlu build tool atau bundler

Library pendukung:
- **Anime.js** — animasi micro-interaction (card entrance, button pulse, toast notification)
- **Supabase JS Client** — untuk komunikasi dengan Supabase API

Font: **Inter** (body) + **Playfair Display** (headings/logo) — kombinasi serif + sans untuk hierarchy yang jelas.

---

## Slide 3: Tech Stack — Backend & Database

Backend: **Supabase** (PostgreSQL + Auth + Storage)

Kenapa Supabase untuk project ini:
1. **Auth** — register/login langsung dari client, tidak perlu server auth sendiri
2. **Database** — PostgreSQL dengan RLS, data terproteksi di level database
3. **Storage** — upload gambar menu langsung ke cloud
4. **Realtime** — order status bisa di-update dan dilihat langsung

Schema database:
- **profiles** — data user (otomatis via trigger)
- **products** — menu items (nama, harga, kategori, gambar, status tersedia)
- **orders** — pesanan user (status: pending → confirmed → preparing → ready → completed)
- **order_items** — detail item dalam pesanan

---

## Slide 4: Fitur Utama

**User Side:**
1. Browse menu dengan gambar dan harga
2. Filter by kategori (Coffee, Non-Coffee, Food, Pastry)
3. Search menu
4. Keranjang belanja dengan quantity adjustment
5. Checkout → order masuk ke database

**Admin Side:**
1. Panel admin dengan daftar pesanan
2. Update status pesanan (Konfirmasi → Siapkan → Siap → Selesai)
3. Kelola menu (tambah, sembunyikan, hapus produk)
4. Lihat semua user

---

## Slide 5: Desain & UX

Desain mengikuti referensi dari **stitch.zip** — sebuah mockup coffee shop ordering app.

Prinsip desain:
1. **Menu-first** — produk langsung terlihat tanpa scroll
2. **Warm palette** — dark bg (#191919) dengan accent golden-orange (#e0a44b) — nuansa kopi
3. **Cart sidebar** — keranjang selalu terlihat di sisi kanan, bukan modal tersembunyi
4. **Horizontal cards** — gambar kecil + text + harga + tombol add — efisien untuk scan cepat

Kenapa cart sidebar (bukan modal):
- Pengguna bisa langsung lihat isi keranjang sambil browse menu
- Tidak perlu klik tombol cart dulu
- Subtotal + pajak terlihat real-time

---

## Slide 6: Alur Pemesanan

```
1. User browse menu (filter/search)
2. Klik "+" → item masuk ke cart sidebar
3. Adjust quantity di cart
4. Klik "Checkout"
5. System buat order + order_items di database
6. Admin lihat pesanan masuk
7. Admin update status: Pending → Confirmed → Preparing → Ready → Completed
```

Status pesanan:
- **Pending** — baru dipesan, menunggu konfirmasi
- **Confirmed** — admin sudah konfirmasi
- **Preparing** — sedang disiapkan
- **Ready** — siap diambil
- **Completed** — selesai
- **Cancelled** — dibatalkan

---

## Slide 7: Arsitektur & Deployment

```
User Browser
  ↓
Frontend (HTML/CSS/JS)
  ↓
Supabase JS Client
  ↓
Supabase Cloud
  ├── Auth (register/login)
  ├── PostgreSQL (products, orders, order_items)
  └── Storage (product images)
```

Deployment:
- **GitHub** — version control
- **Heroku** — Express.js static server

Kenapa architecture ini:
1. **Serverless** — tidak perlu manage server sendiri
2. **Scale otomatis** — Supabase handle scaling
3. **Biaya rendah** — Supabase free tier cukup untuk UAS

---

## Slide 8: Tantangan & Solusi

1. **Tantangan**: Cart harus persisten (tidak hilang saat refresh)
   **Solusi**: Simpan cart di localStorage, sync saat login

2. **Tantangan**: Responsive layout — sidebar cart harus hilang di mobile
   **Solusi**: Media query `@media(max-width:900px)` hide sidebar, tampilkan FAB cart

3. **Tantangan**: Harga harus format Rupiah
   **Solusi**: `toLocaleString('id-ID')` — built-in JavaScript

4. **Tantangan**: Animasi harus accessible
   **Solusi**: Cek `prefers-reduced-motion` sebelum play animasi

---

## Slide 9: Perbandingan dengan ResepKu

| Aspek | ResepKu | Ngopi Dulu |
|-------|---------|------------|
| Tujuan | Sharing resep | Order online |
| Layout | Grid cards | Sidebar cart |
| Cart | Modal/FAB | Sidebar tetap |
| Role | User/Mod/Admin | User/Admin |
| Fitur | Report resep | Order status tracking |
| Desain | Warm cream | Dark charcoal |

Kedua proyek menggunakan stack yang sama (vanilla + Supabase) tapi dengan pendekatan UX yang berbeda sesuai kebutuhan.

---

## Slide 10: Penutup

Ngopi Dulu menunjukkan bagaimana:
- **Vanilla JS** bisa membangun aplikasi ordering yang fungsional
- **Supabase** menghilangkan kebutuhan backend server sendiri
- **Design system** membuat UI konsisten dan profesional
- **Cart sidebar** meningkatkan UX ordering dibanding modal

Terima kasih. Ada pertanyaan?
