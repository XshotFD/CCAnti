Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 1 
KULIAH PRAKTEK KOMPUTASI AWAN 
MODUL 1 
Membangun IaaS Lokal 
Instalasi & Penyediaan Mesin Virtual 
 
Oleh: 
Dr. Andrew B. Osmond 
claude.ai 
 
Mata Kuliah Praktikum Cloud Computing 
Topik Infrastructure-as-a-Service (IaaS) Lokal 
Studi Kasus Aplikasi Pencatatan Kas RW 
Perangkat Windows 11, VirtualBox, Vagrant 
Estimasi Waktu 90 – 120 menit 
 
Pada modul ini, mahasiswa akan membangun infrastruktur server lokal dari nol 
menggunakan teknologi virtualisasi. Dua mesin virtual akan dibuat dan dikonfigurasi agar 
dapat saling berkomunikasi melalui jaringan privat, mensimulasikan arsitektur backend -
database yang umum digunakan di lingkungan cloud. 
 
A. Tujuan Pembelajaran 
Setelah menyelesaikan modul ini, mahasiswa diharapkan mampu: 
• Memahami konsep virtualisasi server dan Infrastructure-as-a-Service (IaaS) 
• Menginstal dan mengonfigurasi VirtualBox sebagai hypervisor lokal 
• Menggunakan Vagrant untuk mendefinisikan dan menyediakan mesin virtual 
secara terprogram 
• Menulis Vagrantfile untuk membuat beberapa VM dalam satu konfigurasi 
• Mengonfigurasi jaringan privat antar VM untuk komunikasi terisolasi 
• Menginstal dan mengonfigurasi MySQL Server agar dapat diakses dari VM lain 
 
B. Latar Belakang 
Bayangkan sebuah RW ingin memiliki sistem pencatatan kas digital. Sistem ini 
membutuhkan setidaknya dua komponen utama: server backend yang menjalankan 
logika aplikasi, dan server database yang menyimpan data keuangan. Di lingkungan cloud 
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 2 
nyata, kedua komponen ini berjalan pada mesin (instance) yang terpisah dan 
berkomunikasi melalui jaringan internal. 
 
Pada modul ini, kita akan mereplikasi arsitektur tersebut secara lokal menggunakan dua 
mesin virtual: 
 
VM IP Address Peran 
vm-backend 192.168.56.10 Server aplikasi (backend) 
vm-database 192.168.56.11 Server basis data (MySQL) 
 
C. Prasyarat 
Sebelum memulai praktikum, pastikan perangkat Anda memenuhi kebutuhan berikut: 
 
Spesifikasi Minimum Perangkat 
• Sistem Operasi: Windows 11 (64-bit) 
• RAM: minimal 8 GB (disarankan 16 GB) 
• Penyimpanan kosong: minimal 10 GB 
• Prosesor: mendukung virtualisasi (VT-x/AMD-V), pastikan sudah diaktifkan di 
BIOS 
 
Perangkat Lunak yang Perlu Diinstal 
• VirtualBox (versi 7.0 atau lebih baru) 
• Vagrant (versi 2.3 atau lebih baru) 
 
 Catatan: Hyper-V dan VirtualBox 
Jika WSL2 aktif di laptop Anda, Hyper-V kemungkinan juga aktif dan dapat menyebabkan 
konflik dengan VirtualBox. Gunakan VirtualBox versi 7.0+ yang sudah lebih kompatibel 
dengan Hyper-V. Vagrant tidak memerlukan WSL — jalankan langsung dari PowerShell. 
 
  
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 3 
D. Instalasi Perangkat Lunak 
D.1. Instalasi VirtualBox 
1. Buka browser dan kunjungi https://www.virtualbox.org/wiki/Downloads 
2. Klik Windows hosts untuk mengunduh installer. 
3. Jalankan file installer (.exe) yang telah diunduh. 
4. Ikuti langkah instalasi dengan klik Next hingga selesai, lalu klik Finish. 
5. Verifikasi instalasi dengan membuka VirtualBox dari menu Start. 
 
D.2. Instalasi Vagrant 
1. Buka browser dan kunjungi https://developer.hashicorp.com/vagrant/downloads 
2. Pilih Windows dan unduh installer AMD64 (.msi). 
3. Jalankan file installer (.msi) yang telah diunduh. 
4. Ikuti langkah instalasi hingga selesai. 
5. Restart komputer setelah instalasi selesai. 
 
D.3. Verifikasi Instalasi 
Buka PowerShell dan jalankan perintah berikut untuk memastikan keduanya terinstal 
dengan benar: 
 
 
vagrant --version 
VBoxManage --version 
 
 
Jika kedua perintah menampilkan nomor versi tanpa error, instalasi berhasil dan Anda 
siap melanjutkan ke langkah berikutnya. 
 
E. Membuat Project Vagrant 
E.1. Membuat Folder Project 
Buka PowerShell, lalu buat folder project dan masuk ke dalamnya: 
 
 
mkdir C:\kasrw 
cd C:\kasrw 
 
 
E.2. Inisialisasi Vagrant 
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 4 
Jalankan perintah berikut untuk menginisialisasi project Vagrant di dalam folder tersebut: 
 
 
vagrant init 
 
 
Perintah ini akan menghasilkan file Vagrantfile di dalam folder C: \kasrw. File ini adalah 
konfigurasi utama yang mendefinisikan semua mesin virtual yang akan dibuat. 
 
E.3. Menulis Vagrantfile 
Buka file Vagrantfile menggunakan teks editor (Notepad, VS Code, atau editor lainnya), 
hapus seluruh isinya, lalu ganti dengan konfigurasi berikut: 
 
 
Vagrant.configure("2") do |config| 
  
  # VM Database 
  config.vm.define "vm-database" do |db| 
    db.vm.box = "bento/ubuntu-22.04" 
    db.vm.hostname = "vm-database" 
    db.vm.network "private_network", ip: "192.168.56.11" 
    db.vm.provider "virtualbox" do |vb| 
      vb.name = "vm-database" 
      vb.memory = "1024" 
      vb.cpus = 1 
    end 
  end 
  
  # VM Backend 
  config.vm.define "vm-backend" do |backend| 
    backend.vm.box = "bento/ubuntu-22.04" 
    backend.vm.hostname = "vm-backend" 
    backend.vm.network "private_network", ip: "192.168.56.10" 
    backend.vm.provider "virtualbox" do |vb| 
      vb.name = "vm-backend" 
      vb.memory = "1024" 
      vb.cpus = 1 
    end 
  end 
  
end 
 
 
 Penjelasan Konfigurasi 
config.vm.define mendefinisikan masing-masing VM secara terpisah dalam satu Vagrantfile. 
private_network mengonfigurasi jaringan internal antar VM sehingga keduanya dapat 
berkomunikasi tanpa terhubung ke internet publik. Tidak diperlukan forwarded_port karena 
tujuan modul ini adalah komunikasi antar VM, bukan akses dari host. 
 
  
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 5 
F. Menjalankan Mesin Virtual 
F.1. Menyalakan Semua VM 
Jalankan perintah berikut dari dalam folder C:\kasrw di PowerShell: 
 
 
vagrant up 
 
 
Vagrant akan mengunduh  box bento/ubuntu-22.04 (sekitar 500 MB) pada pertama kali 
dijalankan. Proses ini memerlukan waktu beberapa menit tergantung kecepatan internet. 
Setelah unduhan selesai, Vagrant akan membuat dan menyalakan kedua VM secara 
otomatis. 
 
F.2. Memeriksa Status VM 
Setelah proses selesai, verifikasi bahwa kedua VM berjalan dengan perintah: 
 
 
vagrant status 
 
 
Output yang diharapkan: 
 
 
Current machine states: 
  
vm-database               running (virtualbox) 
vm-backend                running (virtualbox) 
 
 
G. Verifikasi Koneksi Antar VM 
G.1. Masuk ke vm-backend 
Buka sesi SSH ke vm-backend menggunakan perintah: 
 
 
vagrant ssh vm-backend 
 
 
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 6 
G.2. Ping ke vm-database 
Di dalam vm-backend, uji koneksi jaringan ke vm-database: 
 
 
ping 192.168.56.11 
 
 
Jika muncul reply dari IP tersebut, berarti jaringan privat antara kedua VM sudah 
terhubung dengan benar. Tekan Ctrl+C untuk menghentikan ping, lalu keluar dari VM: 
 
 
exit 
 
 
  
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 7 
H. Instalasi dan Konfigurasi MySQL 
H.1. Install MySQL di vm-database 
Masuk ke vm-database: 
 
 
vagrant ssh vm-database 
 
 
Perbarui daftar paket dan instal MySQL Server: 
 
 
sudo apt update 
sudo apt install -y mysql-server 
 
 
Verifikasi bahwa MySQL berjalan dengan baik: 
 
 
sudo systemctl status mysql 
 
 
Pastikan status menampilkan active (running) sebelum melanjutkan. 
 
H.2. Membuat Database dan User 
Masuk ke konsol MySQL sebagai root: 
 
 
sudo mysql 
 
 
Buat database kasrw beserta user yang hanya bisa diakses dari IP vm-backend: 
 
 
CREATE DATABASE kasrw; 
CREATE USER 'kasrw_user'@'192.168.56.10' IDENTIFIED BY 'password123'; 
GRANT ALL PRIVILEGES ON kasrw.* TO 'kasrw_user'@'192.168.56.10'; 
FLUSH PRIVILEGES; 
EXIT; 
 
 
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 8 
 Konsep Zero-Trust Awal 
Perhatikan bahwa user kasrw_user hanya diizinkan login dari IP 192.168.56.10 (vm-
backend). Artinya, tidak ada mesin lain — termasuk host Windows Anda — yang bisa login 
menggunakan user ini. Inilah prinsip isolasi akses database yang umum diterapkan di 
arsitektur cloud. 
 
H.3. Mengizinkan Koneksi dari Luar Localhost 
Secara default, MySQL hanya menerima koneksi dari localhost. Kita perlu mengubah 
konfigurasi ini agar vm-backend dapat terhubung: 
 
 
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf 
 
 
Cari baris berikut: 
 
 
bind-address = 127.0.0.1 
 
 
Ubah menjadi: 
 
 
bind-address = 0.0.0.0 
 
 
Simpan file dengan menekan Ctrl+X, lalu Y, lalu Enter. Kemudian restart MySQL: 
 
 
sudo systemctl restart mysql 
 
 
Keluar dari vm-database: 
 
 
exit 
 
 
  
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 9 
I. Uji Koneksi MySQL dari vm-backend 
I.1. Masuk ke vm-backend 
 
vagrant ssh vm-backend 
 
 
I.2. Install MySQL Client 
 
sudo apt update 
sudo apt install -y mysql-client 
 
 
I.3. Koneksi ke MySQL di vm-database 
Jalankan perintah berikut untuk menghubungkan MySQL client di vm-backend ke MySQL 
server di vm-database: 
 
 
mysql -u kasrw_user -p -h 192.168.56.11 
 
 
Masukkan password password123 saat diminta. Jika berhasil, Anda akan melihat MySQL 
prompt seperti berikut: 
 
 
Welcome to the MySQL monitor.  Commands end with ; or \g. 
mysql> 
 
 
Verifikasi bahwa database kasrw tersedia: 
 
 
SHOW DATABASES; 
 
 
Keluar dari MySQL dan dari vm-backend: 
 
 
EXIT; 
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 10 
exit 
 
 
 Goal Modul 1 Tercapai! 
Jika Anda berhasil masuk ke MySQL prompt dari vm-backend dan melihat database kasrw, 
berarti dua mesin virtual berhasil dibuat, dikonfigurasi, dan saling terhubung melalui jaringan 
privat. Ini adalah fondasi infrastruktur yang akan terus kita kembangkan di modul-modul 
berikutnya. 
 
J. Perintah Vagrant yang Berguna 
 
Perintah Fungsi 
vagrant up Menyalakan semua VM 
vagrant status Melihat status semua VM 
vagrant ssh vm-backend Masuk ke VM tertentu via SSH 
vagrant halt Mematikan semua VM 
vagrant halt vm-database Mematikan VM tertentu 
vagrant destroy Menghapus semua VM (permanen) 
vagrant reload Merestart VM (reload Vagrantfile) 
 
  
Praktikum Cloud Computing Modul 1 — IaaS Lokal 
 
 
Aplikasi Kas RW — Membangun IaaS Lokal Halaman 11 
K. Troubleshooting 
VirtualBox tidak bisa membuat VM 64-bit 
Kemungkinan fitur virtualisasi (VT -x/AMD-V) belum diaktifkan  di BIOS. Masuk ke BIOS 
saat startup dan aktifkan opsi Intel Virtualization Technology atau SVM Mode (untuk 
AMD). 
 
vagrant up gagal dengan error VirtualBox dan Hyper-V 
Jika muncul pesan error terkait konflik Hyper-V, pastikan VirtualBox yang terinstal adalah 
versi 7.0 atau lebih baru karena versi tersebut sudah mendukung koeksistensi dengan 
Hyper-V di Windows 11. 
 
Koneksi MySQL dari vm-backend ditolak (Connection refused) 
Periksa kembali apakah bind -address di mysqld.cnf sudah diubah menjadi 0.0.0.0 dan 
MySQL sudah direstart. Pastikan juga user kasrw_user dibuat dengan host 
192.168.56.10, bukan localhost. 
 
Box bento/ubuntu-22.04 gagal diunduh 
Pastikan koneksi internet stabil. Jika unduhan terputus di tengah jalan, jalankan  vagrant 
box remove bento/ubuntu-22.04 lalu coba vagrant up kembali. 
 
L. Kesimpulan 
Pada modul ini, kita telah berhasil membangun infrastruktur IaaS lokal yang terdiri dari 
dua mesin virtual yang saling terhubung. Dengan menggunakan Vagrant dan VirtualBox, 
seluruh infrastruktur didefinisikan dalam satu file konfigurasi (Vagrantfile) sehin gga dapat 
direplikasi dengan mudah. 
 
Arsitektur yang kita bangun hari ini — vm-backend yang terhubung ke vm -database — 
adalah fondasi dari aplikasi Kas RW yang akan terus kita kembangkan. Pada modul 
berikutnya, semua langkah konfigurasi manual yang dilakukan hari ini akan diotomatisasi 
menggunakan Ansible. 
 
