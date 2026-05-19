# KULIAH PRAKTEK KOMPUTASI AWAN
## MODUL X
**Implementasi Website Sistem Informasi Jadwal Kuliah Berbasis Cloud Menggunakan Docker, Ansible, AWS EC2, dan GitHub**

---

### A. Tujuan Pembelajaran
*Berisi daftar poin kompetensi yang akan dicapai mahasiswa setelah menyelesaikan modul ini (misal: memahami containerization, mengorkestrasi AWS dengan Ansible, dan menggunakan GitHub untuk manajemen kode).*

### B. Latar Belakang
*Penjelasan skenario mengapa Sistem Informasi Jadwal Kuliah membutuhkan arsitektur cloud, keuntungan menggunakan Docker untuk konsistensi lingkungan, serta peran Ansible dan GitHub dalam otomasi.*

### C. Prasyarat
*Daftar kebutuhan sebelum memulai praktikum:*
* Akun AWS Academy / Learner Lab.
* File `labsuser.pem` untuk akses SSH.
* Akun GitHub dan pemahaman dasar Git.
* Terminal/PowerShell lokal.

### D. Arsitektur Sistem
*Penjelasan topologi yang akan dibangun. Misalnya:*
* 1 EC2 Instance sebagai **Ansible Controller**.
* 1 atau 2 EC2 Instance sebagai **Docker Host** (menjalankan container frontend, backend, dan database aplikasi Jadwal Kuliah).
* Repositori GitHub sebagai sumber source code (Codebase).

### E. Persiapan Infrastruktur AWS (EC2)
**E.1. Membuat Security Group**
* Mengatur firewall (Inbound Rules) untuk SSH (22), HTTP (80), dan port aplikasi Docker.

**E.2. Meluncurkan EC2 Instances**
* Memilih AMI (misal Ubuntu 24.04), tipe instance (t2.micro), dan memasang key pair `labsuser.pem`.

**E.3. Mencatat IP Address**
* Mencatat Public IP dan Private IP dari masing-masing instance.

### F. Konfigurasi Ansible Controller
**F.1. Akses SSH ke Ansible Controller**
* Langkah-langkah remote SSH dari mesin lokal ke instance controller.

**F.2. Instalasi Ansible**
* Menjalankan perintah instalasi Ansible di EC2 controller.

**F.3. Setup Struktur Direktori, Inventory, dan SSH Key**
* Membuat file `hosts.ini` (mengatur grup host menggunakan Private IP).
* Mengamankan file `.pem` di dalam controller agar bisa mengakses node lain.

### G. Otomasi Instalasi Docker via Ansible
**G.1. Pembuatan Ansible Playbook (`install-docker.yml`)**
* Menulis task untuk: Update APT, install dependencies, menambahkan Docker GPG key & repository, serta instalasi Docker Engine & Docker Compose.

**G.2. Menjalankan Playbook Instalasi**
* Mengeksekusi playbook ke target node (Docker Host) dan memastikan status *changed* atau *ok*.

### H. Deployment Aplikasi via GitHub dan Docker
**H.1. Clone Source Code dari GitHub**
* Menggunakan Ansible (atau manual di host) untuk melakukan `git clone` repositori Sistem Informasi Jadwal Kuliah.

**H.2. Konfigurasi `docker-compose.yml`**
* Penjelasan isi file `docker-compose.yml` yang mengatur service frontend (misal: Nginx/React), backend (Node.js/PHP), dan database (MySQL/PostgreSQL).

**H.3. Eksekusi Docker Compose**
* Perintah untuk menjalankan container aplikasi secara *detached* (`docker compose up -d`).

### I. Verifikasi Hasil Deployment
**I.1. Cek Status Container**
* Menggunakan `docker ps` untuk memastikan semua service berjalan.

**I.2. Akses Frontend Aplikasi**
* Mengakses sistem informasi jadwal kuliah melalui browser menggunakan Public IP.

### J. Perintah yang Berguna
*Tabel referensi perintah cepat (Cheat Sheet):*
* Perintah Git (`git clone`, `git pull`).
* Perintah Docker (`docker ps`, `docker logs`, `docker compose up/down`).
* Perintah Ansible (`ansible-playbook`, `ansible all -m ping`).

### K. Troubleshooting
*Solusi untuk error yang sering terjadi:*
* `Permission denied (publickey)` saat SSH.
* Error `UNREACHABLE` pada Ansible ping.
* Port conflict atau container gagal *up* pada Docker.

### L. Kesimpulan
*Rangkuman pencapaian modul bahwa infrastruktur Sistem Informasi Jadwal Kuliah berhasil di-deploy dari kode (GitHub), diotomasi dengan Ansible, dibungkus (containerized) dengan Docker, dan berjalan di cloud AWS.*
