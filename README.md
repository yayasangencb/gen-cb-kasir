# Gen CB Flow

Buatkan aplikasi web Point of Sale atau mesin kasir modern dengan nama:

GEN-CB KASIR

Aplikasi ini digunakan untuk operasional kasir seperti di kafe, kantin, bazar, atau kegiatan usaha GEN-CB. Fokus utama aplikasi adalah kemudahan penggunaan melalui perangkat tablet, tetapi tetap responsif dan dapat digunakan melalui laptop maupun komputer.

Gunakan tampilan modern, bersih, mudah dipahami, serta memiliki tombol-tombol besar agar nyaman digunakan pada layar sentuh.

1. TUJUAN APLIKASI

Aplikasi Gen CB Kasir harus dapat digunakan untuk:

Menambahkan dan mengelola produk.

Melakukan transaksi dengan cara memilih produk.

Menentukan jumlah produk yang dibeli.

Menghitung total belanja secara otomatis.

Memasukkan jumlah uang yang dibayarkan pelanggan.

Menghitung uang kembalian secara otomatis.

Memilih metode pembayaran.

Mencetak atau mengunduh struk.

Membuat nomor antrean otomatis.

Memantau status pesanan.

Menampilkan display nomor antrean untuk pelanggan.

Melihat riwayat transaksi.

Membuat laporan penjualan.

Mengelola stok produk.

Digunakan dengan nyaman melalui tablet.

2. TARGET PERANGKAT

Utamakan desain untuk perangkat tablet dengan orientasi landscape.

Ukuran tampilan utama yang disarankan:

Tablet landscape 1024 × 768.

Tablet landscape 1280 × 800.

Laptop dan desktop.

Tetap responsif untuk HP, tetapi penggunaan utama adalah tablet.

Gunakan prinsip:

Tombol besar dan mudah disentuh.

Tidak terlalu banyak teks kecil.

Navigasi sederhana.

Tidak perlu banyak scroll pada halaman kasir.

Produk dapat dipilih hanya dengan satu kali klik.

Informasi pesanan terlihat jelas.

Area keranjang selalu terlihat.

3. SISTEM LOGIN DAN HAK AKSES

Buat halaman login dengan logo GEN-CB dan nama “Gen CB Kasir”.

Sediakan beberapa role:

Administrator

Administrator dapat:

Mengelola produk.

Mengelola kategori.

Mengelola stok.

Mengelola pengguna.

Mengatur printer.

Melihat seluruh transaksi.

Melihat laporan.

Mengatur profil toko.

Mengatur pajak dan biaya tambahan.

Membatalkan transaksi.

Mengatur nomor antrean.

Mengakses dashboard.

Kasir

Kasir dapat:

Melakukan transaksi.

Memilih produk.

Mengatur jumlah pesanan.

Memasukkan pembayaran.

Mencetak struk.

Melihat transaksi pada shift sendiri.

Mengubah status pesanan.

Membuka dan menutup shift kasir.

Dapur atau Penyaji

Pengguna dapur dapat:

Melihat daftar pesanan masuk.

Mengubah status pesanan menjadi “Sedang Diproses”.

Mengubah status pesanan menjadi “Selesai”.

Melihat catatan khusus pada pesanan.

4. DASHBOARD UTAMA

Buat dashboard ringkas dan visual.

Tampilkan informasi:

Total penjualan hari ini.

Jumlah transaksi hari ini.

Jumlah produk terjual.

Jumlah pesanan menunggu.

Jumlah pesanan sedang diproses.

Jumlah pesanan selesai.

Produk dengan stok menipis.

Produk paling laris.

Grafik penjualan harian.

Ringkasan metode pembayaran.

Aktivitas transaksi terbaru.

Gunakan card besar dengan icon modern.

5. HALAMAN KASIR / POINT OF SALE

Ini merupakan halaman utama aplikasi.

Gunakan layout dua bagian.

Bagian Kiri: Daftar Produk

Tampilkan:

Kolom pencarian produk.

Tombol scan barcode.

Filter kategori.

Daftar produk dalam bentuk card.

Foto produk.

Nama produk.

Harga produk.

Informasi stok.

Status tersedia atau habis.

Contoh kategori:

Semua.

Kopi.

Minuman.

Makanan.

Snack.

Paket.

Lainnya.

Produk harus dapat ditambahkan ke keranjang dengan satu kali klik.

Contoh:

Pelanggan membeli Kopi Susu.

Kasir cukup menekan card “Kopi Susu”, kemudian produk masuk ke keranjang. Jika produk dipilih kembali, jumlah produk otomatis bertambah.

Bagian Kanan: Keranjang Pesanan

Tampilkan:

Nomor transaksi.

Nomor antrean.

Nama kasir.

Waktu transaksi.

Daftar produk.

Harga satuan.

Tombol tambah jumlah.

Tombol kurangi jumlah.

Input jumlah manual.

Tombol hapus produk.

Catatan pesanan.

Subtotal.

Diskon.

Pajak.

Biaya layanan.

Total pembayaran.

Sediakan tombol besar:

Kosongkan keranjang.

Simpan pesanan.

Tahan pesanan.

Bayar sekarang.

6. VARIAN DAN TAMBAHAN PRODUK

Setiap produk dapat memiliki varian.

Contoh Kopi Susu:

Ukuran kecil.

Ukuran sedang.

Ukuran besar.

Panas.

Dingin.

Gula normal.

Sedikit gula.

Tanpa gula.

Tambahan atau topping:

Extra shot.

Susu tambahan.

Keju.

Cokelat.

Es krim.

Topping tambahan.

Setiap varian atau topping dapat memiliki harga tambahan.

Saat produk diklik, tampilkan pop-up pemilihan varian sebelum produk dimasukkan ke keranjang.

7. SISTEM PEMBAYARAN

Setelah menekan tombol “Bayar Sekarang”, tampilkan modal pembayaran dengan ukuran besar dan cocok untuk tablet.

Tampilkan:

Total tagihan.

Metode pembayaran.

Jumlah uang diterima.

Uang kembalian.

Tombol nominal cepat.

Tombol proses pembayaran.

Metode pembayaran:

Tunai.

QRIS.

Transfer Bank.

E-Wallet.

Kartu Debit.

Pembayaran lainnya.

Untuk pembayaran tunai, sediakan tombol nominal cepat berdasarkan total transaksi.

Contoh:

Total belanja Rp18.000.

Tampilkan tombol:

Uang Pas.

Rp20.000.

Rp50.000.

Rp100.000.

Jika kasir memasukkan uang Rp50.000, sistem otomatis menampilkan:

Total: Rp18.000
Uang Diterima: Rp50.000
Kembalian: Rp32.000

Tombol “Selesaikan Pembayaran” hanya aktif jika jumlah uang sudah mencukupi.

8. NOMOR ANTREAN

Setelah pembayaran berhasil, sistem otomatis membuat nomor antrean.

Format nomor antrean:

001

002

003

004

dan seterusnya.

Nomor antrean dapat direset otomatis setiap hari atau direset manual oleh administrator.

Setiap antrean memiliki tiga status utama:

Menunggu

Warna putih atau abu-abu sangat muda.

Contoh:

001 — Menunggu

Pesanan sudah masuk tetapi belum mulai diproses.

Sedang Diproses

Warna kuning atau gold orange.

Contoh:

002 — Sedang Diproses

Pesanan sedang dibuat oleh dapur atau penyaji.

Selesai

Warna hijau.

Contoh:

003 — Selesai

Pesanan sudah selesai dibuat dan siap diambil atau sudah dihidangkan.

Tambahkan status tambahan:

Dibatalkan.

Sudah Diambil.

Gunakan warna merah untuk pesanan yang dibatalkan dan warna biru untuk pesanan yang sudah diambil.

9. DISPLAY NOMOR ANTREAN

Buat halaman khusus bernama:

Display Antrean

Halaman ini dapat dibuka pada monitor, televisi, laptop, atau proyektor yang menghadap pelanggan.

Halaman display antrean harus dapat ditampilkan secara fullscreen.

Tampilkan tiga kolom utama:

Menunggu

Card antrean dengan latar putih.

Contoh:

001
004
007

Sedang Diproses

Card antrean dengan latar kuning.

Contoh:

002
005

Selesai

Card antrean dengan latar hijau.

Contoh:

003
006

Nomor antrean harus ditampilkan dengan ukuran sangat besar dan mudah dibaca dari jarak jauh.

Ketika status antrean berubah menjadi selesai:

Nomor antrean muncul lebih besar.

Berikan animasi glow atau pulse yang lembut.

Putar suara notifikasi.

Tampilkan teks “Pesanan Siap Diambil”.

Nomor yang baru selesai berada di posisi paling atas.

Tambahkan opsi pengumuman suara otomatis:

“Nomor antrean 003, pesanan Anda telah selesai dan siap diambil.”

Display harus melakukan pembaruan secara real-time tanpa refresh halaman.

Sediakan tombol:

Fullscreen.

Aktifkan atau matikan suara.

Tampilkan hanya antrean selesai.

Reset tampilan.

Pengaturan ukuran font.

10. HALAMAN DAPUR / KITCHEN DISPLAY SYSTEM

Buat halaman khusus untuk dapur atau penyaji.

Tampilkan pesanan dalam bentuk card berdasarkan status.

Setiap card menampilkan:

Nomor antrean.

Jam pesanan.

Durasi sejak pesanan masuk.

Daftar produk.

Jumlah produk.

Varian.

Catatan pesanan.

Nama kasir.

Jenis pesanan.

Jenis pesanan:

Makan di tempat.

Bungkus.

Ambil sendiri.

Pesanan khusus.

Tombol pada card:

Mulai Proses.

Tandai Selesai.

Sudah Diambil.

Batalkan.

Urutan pesanan berdasarkan waktu masuk paling lama.

Berikan indikator warna jika pesanan terlalu lama:

Normal: biru.

Lebih dari 10 menit: kuning.

Lebih dari 20 menit: merah.

11. STRUK PEMBAYARAN

Setelah transaksi selesai, tampilkan preview struk.

Isi struk:

Logo GEN-CB.

Nama usaha.

Alamat.

Nomor WhatsApp.

Nomor transaksi.

Nomor antrean.

Tanggal dan jam.

Nama kasir.

Daftar produk.

Jumlah produk.

Harga satuan.

Subtotal.

Diskon.

Pajak.

Total pembayaran.

Metode pembayaran.

Uang diterima.

Uang kembalian.

Pesan terima kasih.

QR code transaksi jika diperlukan.

Contoh penutup:

“Terima kasih telah berbelanja di Gen CB Kasir.”

“Pesanan Anda sedang kami proses.”

Sediakan pilihan:

Cetak struk thermal 58 mm.

Cetak struk thermal 80 mm.

Simpan sebagai PDF.

Kirim struk melalui WhatsApp.

Cetak ulang struk.

Struk harus menggunakan desain hitam putih agar hemat tinta dan mudah dicetak melalui printer thermal.

12. MANAJEMEN PRODUK

Buat halaman Produk dengan fitur:

Tambah produk.

Edit produk.

Hapus produk.

Nonaktifkan produk.

Upload foto produk.

Nama produk.

SKU.

Barcode.

Kategori.

Harga jual.

Harga modal.

Stok.

Satuan.

Stok minimum.

Varian.

Topping.

Deskripsi.

Status tersedia.

Produk favorit.

Produk terlaris.

Sediakan import produk melalui file Excel atau CSV.

Sediakan export data produk.

Produk dengan stok habis tidak dapat dipilih pada halaman kasir.

13. MANAJEMEN STOK

Buat sistem stok otomatis.

Ketika transaksi berhasil:

Stok produk otomatis berkurang.

Riwayat perubahan stok tercatat.

Produk dengan stok minimum menampilkan peringatan.

Sediakan menu:

Stok masuk.

Stok keluar.

Penyesuaian stok.

Stok rusak.

Riwayat stok.

Stok minimum.

Laporan stok.

Tampilkan notifikasi:

“Stok Kopi Susu tersisa 5.”

14. RIWAYAT TRANSAKSI

Buat halaman transaksi yang menampilkan:

Nomor transaksi.

Nomor antrean.

Tanggal.

Jam.

Nama kasir.

Total.

Metode pembayaran.

Status pembayaran.

Status pesanan.

Filter berdasarkan:

Hari ini.

Minggu ini.

Bulan ini.

Rentang tanggal.

Kasir.

Metode pembayaran.

Status transaksi.

Aksi transaksi:

Lihat detail.

Cetak ulang struk.

Batalkan transaksi.

Refund.

Kirim struk.

Unduh PDF.

Pembatalan atau refund harus meminta PIN administrator.

15. LAPORAN PENJUALAN

Buat laporan:

Penjualan harian.

Penjualan mingguan.

Penjualan bulanan.

Penjualan per produk.

Penjualan per kategori.

Penjualan per kasir.

Penjualan per metode pembayaran.

Produk paling laris.

Produk kurang laku.

Laba kotor.

Total diskon.

Total pajak.

Total transaksi.

Rata-rata nilai transaksi.

Sediakan grafik yang bersih dan mudah dibaca.

Laporan dapat:

Difilter.

Dicetak.

Diekspor ke Excel.

Diekspor ke PDF.

16. SHIFT KASIR

Buat fitur buka dan tutup shift.

Saat membuka shift, kasir memasukkan:

Saldo awal kas.

Nama kasir.

Waktu mulai.

Saat menutup shift, tampilkan:

Saldo awal.

Total transaksi tunai.

Total transaksi non-tunai.

Perkiraan saldo kas.

Saldo aktual.

Selisih kas.

Catatan kasir.

Waktu tutup shift.

17. HOLD DAN GABUNG PESANAN

Sediakan fitur:

Tahan pesanan.

Lanjutkan pesanan yang ditahan.

Gabungkan dua pesanan.

Pindahkan pesanan.

Tambah produk pada pesanan yang belum dibayar.

Simpan pesanan berdasarkan nama pelanggan atau nomor meja.

18. PROFIL TOKO

Administrator dapat mengatur:

Nama usaha.

Logo.

Alamat.

Nomor WhatsApp.

Email.

Footer struk.

Mata uang.

Pajak.

Biaya layanan.

Format nomor transaksi.

Format nomor antrean.

Jam operasional.

Ukuran printer.

Suara nomor antrean.

19. DESAIN DAN IDENTITAS VISUAL GEN-CB

Gunakan identitas visual GEN-CB.

Warna Utama

Primary:

Deep Blue: #002B7F

Royal Blue: #0047B3

Sky Blue: #00A3FF

Accent:

Orange: #FF7A00

Gold Orange: #FFB000

Neutral:

White: #FFFFFF

Soft White: #F7F9FC

Gray: #B7BEC8

Warna tambahan untuk status:

Hijau selesai: #22C55E

Kuning proses: #FACC15

Merah batal: #EF4444

Biru sudah diambil: #3B82F6

Gaya Visual

Gunakan:

Background putih bersih.

Gradient biru yang lembut.

Wave biru dan orange.

Efek glassmorphism tipis.

Pattern titik-titik kecil.

Lingkaran blur putih.

Glow biru tipis.

Shape modern melengkung.

Card dengan sudut rounded 20–30 px.

Shadow lembut.

Icon outline modern.

Tombol besar.

Spacing yang lega.

Tampilan profesional tetapi tetap ramah.

Jangan menggunakan:

Background gelap penuh.

Tampilan terlalu ramai.

Layout terlalu formal seperti aplikasi perkantoran.

Terlalu banyak garis tabel.

Font formal lama.

Tombol kecil.

Animasi berlebihan.

20. FONT

Gunakan salah satu font berikut:

Poppins.

Montserrat.

Outfit.

Rekomendasi:

Judul: Poppins ExtraBold.

Subjudul: Poppins SemiBold.

Isi: Poppins Regular.

Angka total dan nomor antrean: Poppins ExtraBold.

Jangan gunakan Times New Roman atau font formal jadul.

21. NAVIGASI

Untuk tablet, gunakan sidebar di sebelah kiri yang dapat diperkecil.

Menu utama:

Dashboard.

Kasir.

Pesanan.

Dapur.

Display Antrean.

Produk.

Kategori.

Stok.

Transaksi.

Laporan.

Shift.

Pengguna.

Pengaturan.

Keluar.

Pada halaman kasir, buat mode khusus tanpa sidebar agar area produk dan keranjang lebih luas.

22. ANIMASI

Gunakan animasi sederhana:

Fade.

Slide lembut.

Zoom ringan.

Pulse pada nomor antrean selesai.

Transisi card yang halus.

Jangan gunakan:

Bounce berlebihan.

Spin.

Animasi cepat.

Efek yang mengganggu kasir.

23. REAL-TIME

Gunakan sistem real-time untuk:

Pesanan baru masuk ke halaman dapur.

Perubahan status pesanan.

Display antrean.

Perubahan stok.

Dashboard penjualan.

Notifikasi pesanan selesai.

Gunakan Supabase sebagai backend dan database.

Gunakan Supabase Realtime agar perubahan status pesanan langsung muncul di semua perangkat tanpa refresh.

24. STRUKTUR DATABASE

Buat struktur database yang mencakup tabel:

users

user_roles

products

product_categories

product_variants

product_addons

product_stocks

stock_histories

transactions

transaction_items

payments

orders

order_items

queues

shifts

store_settings

activity_logs

Relasi harus dibuat dengan rapi dan aman.

Gunakan UUID untuk ID utama.

Gunakan timestamp untuk setiap data.

25. KEAMANAN

Terapkan:

Login menggunakan Supabase Authentication.

Role-based access control.

Row Level Security.

PIN administrator untuk pembatalan transaksi.

Konfirmasi sebelum menghapus data.

Activity log.

Session timeout.

Validasi input.

Proteksi terhadap transaksi duplikat.

Backup data.

26. FITUR TAMBAHAN

Tambahkan fitur berikut:

Mode fullscreen untuk kasir.

Mode fullscreen untuk display antrean.

Keyboard shortcut untuk laptop.

Dukungan barcode scanner.

Dukungan printer thermal.

Tombol produk favorit.

Mode pesanan makan di tempat atau bungkus.

Nomor meja.

Nama pelanggan.

Catatan pesanan.

Diskon nominal atau persen.

Pembulatan pembayaran.

Mode offline sementara.

Sinkronisasi kembali ketika internet aktif.

Suara notifikasi pesanan baru.

Suara notifikasi pesanan selesai.

Dark mode opsional, tetapi tema utama tetap terang.

PWA agar aplikasi dapat dipasang pada tablet seperti aplikasi native.

27. ALUR TRANSAKSI

Alur transaksi harus seperti berikut:

Kasir login.

Kasir membuka shift.

Kasir membuka halaman Kasir.

Kasir memilih produk.

Produk masuk ke keranjang.

Kasir mengatur jumlah produk.

Kasir memilih varian atau topping.

Kasir menambahkan catatan jika diperlukan.

Sistem menghitung total.

Kasir menekan “Bayar Sekarang”.

Kasir memilih metode pembayaran.

Kasir memasukkan uang pelanggan.

Sistem menghitung kembalian.

Kasir menyelesaikan pembayaran.

Sistem membuat nomor antrean.

Struk dapat dicetak.

Pesanan masuk ke halaman dapur.

Dapur mengubah status menjadi “Sedang Diproses”.

Display antrean berubah menjadi warna kuning.

Dapur mengubah status menjadi “Selesai”.

Display antrean berubah menjadi warna hijau.

Nomor antrean diumumkan.

Pesanan diberikan kepada pelanggan.

Status diubah menjadi “Sudah Diambil”.

28. CONTOH TAMPILAN HALAMAN KASIR

Header atas:

Logo GEN-CB
Gen CB Kasir
Nama Kasir
Jam Real-Time
Status Shift
Tombol Fullscreen

Bagian kiri:

Pencarian produk
Kategori produk
Grid card produk

Bagian kanan:

Nomor Antrean
Daftar Produk
Jumlah
Catatan
Subtotal
Diskon
Pajak
Total
Tombol Bayar

Gunakan rasio area:

65% untuk daftar produk.

35% untuk keranjang.

Pada tablet dengan layar lebih kecil, gunakan rasio:

60% daftar produk.

40% keranjang.

29. DATA DEMO

Tambahkan data produk contoh:

Kategori Kopi

Kopi Hitam — Rp8.000

Kopi Susu — Rp12.000

Es Kopi Gula Aren — Rp15.000

Cappuccino — Rp18.000

Kategori Minuman

Es Teh — Rp5.000

Teh Hangat — Rp4.000

Air Mineral — Rp4.000

Es Cokelat — Rp12.000

Kategori Makanan

Nasi Goreng — Rp18.000

Mie Goreng — Rp15.000

Kentang Goreng — Rp12.000

Roti Bakar — Rp10.000

Kategori Snack

Pisang Goreng — Rp8.000

Cireng — Rp8.000

Keripik — Rp5.000

Tambahkan beberapa transaksi demo dan nomor antrean demo:

001 — Menunggu.

002 — Sedang Diproses.

003 — Selesai.

30. HASIL AKHIR YANG DIHARAPKAN

Buat aplikasi web Gen CB Kasir yang:

Terlihat modern seperti aplikasi kasir kafe profesional.

Nyaman digunakan pada layar tablet.

Memiliki sistem produk dan transaksi lengkap.

Memiliki perhitungan uang dan kembalian otomatis.

Dapat mencetak struk.

Memiliki display nomor antrean real-time.

Memiliki halaman dapur.

Memiliki manajemen stok.

Memiliki laporan penjualan.

Menggunakan identitas visual GEN-CB.

Memiliki desain putih, biru, dan orange.

Memiliki performa cepat.

Mudah digunakan oleh kasir yang belum terbiasa menggunakan aplikasi.

Siap dikembangkan menjadi aplikasi produksi.

Pastikan semua tombol berfungsi dan bukan hanya desain statis. Gunakan komponen reusable, struktur kode yang rapi, serta database Supabase yang terintegrasi.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gen-cb-kasir.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f299c316-a53c-40e8-88fd-8df352f0eb6b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
