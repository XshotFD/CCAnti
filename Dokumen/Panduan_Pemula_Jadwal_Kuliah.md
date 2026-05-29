# KULIAH PRAKTEK KOMPUTASI AWAN
## PANDUAN PRAKTIKUM: Edisi Pemula
**Implementasi Website Sistem Informasi Jadwal Kuliah Berbasis Cloud Menggunakan Docker, Ansible, AWS EC2, dan GitHub**

---

Selamat datang di Panduan Praktikum Komputasi Awan Edisi Pemula! Di modul ini, kita akan belajar bagaimana membangun dan meluncurkan sebuah website Sistem Informasi Jadwal Kuliah di internet. Jangan khawatir jika kamu belum pernah melakukannya, panduan ini dirancang khusus agar mudah diikuti selangkah demi selangkah.

### A. Tujuan Pembelajaran
Setelah menyelesaikan modul ini, kamu akan bisa:
1. **Memahami Docker:** Cara membungkus aplikasi agar bisa jalan di komputer mana saja tanpa error (sering disebut *containerization*).
2. **Menggunakan AWS EC2:** Cara menyewa dan mengatur komputer virtual (server) di cloud AWS.
3. **Menggunakan Ansible:** Cara menyuruh satu server secara otomatis menginstal program di server lain, sehingga menghemat waktu kita.
4. **Mendeploy Aplikasi:** Menjalankan website jadwal kuliah yang kodenya diambil langsung dari GitHub ke server cloud kamu.

### B. Latar Belakang (Mengapa Kita Melakukan Ini?)
Bayangkan kamu punya aplikasi web Jadwal Kuliah. Jika kamu jalankan di laptopmu sendiri, mungkin berjalan lancar. Namun, ketika dipindahkan ke server atau laptop temanmu, tiba-tiba muncul error (biasanya karena perbedaan versi software). 

Solusinya adalah **Docker**! Docker akan "membungkus" aplikasi beserta semua kebutuhannya. Lalu, untuk menginstal Docker di server tanpa harus mengetik perintah satu per satu, kita gunakan **Ansible**. Terakhir, kode aplikasi kita simpan di **GitHub** agar rapi dan mudah diambil oleh server.

### C. Prasyarat (Yang Perlu Disiapkan)
Sebelum mulai, pastikan kamu sudah punya:
* Akun AWS Academy / Learner Lab yang aktif.
* Akses Terminal (di Mac/Linux) atau PowerShell/Git Bash (di Windows).
* File kunci akses SSH bernama `labsuser.pem` (bisa diunduh dari Learner Lab).
* Akun GitHub dan koneksi internet yang stabil.

### D. Arsitektur Sistem (Gambaran Umum)
Kita akan menyewa **dua komputer (EC2 Instance)** di AWS:
1. **Ansible Controller:** Komputer bos yang tugasnya mengirim perintah.
2. **Docker Host:** Komputer pekerja yang akan menjalankan aplikasi website kita (Frontend, Backend, dan Database).
*Sumber kode (Codebase)* akan diambil langsung dari Repositori GitHub.

---

### E. Persiapan Infrastruktur AWS (EC2)
Mari kita siapkan server kita di AWS!

**E.1. Membuat Security Group (Firewall)**
Ibarat satpam, Security Group bertugas mengatur siapa saja yang boleh masuk ke server kita.
1. Buka AWS Console, masuk ke menu **EC2** lalu pilih **Security Groups**.
2. Klik **Create security group**.
3. Beri nama: `sg-jadwal-kuliah`.
4. Di bagian **Inbound rules**, tambahkan 3 aturan berikut (pilih source `0.0.0.0/0`):
   - **SSH (Port 22):** Agar kita bisa meremote server dari laptop.
   - **HTTP (Port 80):** Agar website bisa diakses lewat browser.
   - **All traffic:** Untuk source, pilih nama grup ini (`sg-jadwal-kuliah`) agar sesama server kita bisa saling ngobrol.
5. Klik Create.

**E.2. Meluncurkan EC2 Instances**
Lakukan langkah ini **2 kali** untuk membuat 2 server:
1. Klik **Launch instance**.
2. **Name:** Beri nama `ansible-controller` (untuk server pertama) dan `docker-host` (untuk server kedua).
3. **OS (Sistem Operasi):** Pilih Ubuntu Server 24.04 LTS.
4. **Instance type:** Pilih `t2.micro` (gratis/murah).
5. **Key pair:** Pilih `vockey` (atau buat baru jika tidak ada).
6. **Network settings:** Pilih *Select existing security group*, lalu centang `sg-jadwal-kuliah`.
7. Klik **Launch instance**.

**E.3. Mencatat IP Address**
Kembali ke halaman Instances, pastikan keduanya berstatus *Running*. Catat IP mereka:
* `ansible-controller` -> Public IP: `...` | Private IP: `...`
* `docker-host` -> Public IP: `...` | Private IP: `...`

---

### F. Konfigurasi Ansible Controller (Server Bos)
Sekarang kita akan masuk ke server bos dan mengajarinya cara mengontrol server pekerja.

**F.1. Akses SSH ke Ansible Controller**
Buka PowerShell/Terminal di laptopmu, buka folder tempat file `labsuser.pem` berada.
```bash
# Ubah izin file (khusus pengguna Mac/Linux)
chmod 400 labsuser.pem

# Masuk ke server Ansible
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>
```

**F.2. Instalasi Ansible**
Di dalam terminal server, jalankan perintah ini untuk menginstal Ansible:
```bash
sudo apt update
sudo apt install -y ansible
```

**F.3. Menyiapkan Kunci dan Buku Catatan (Inventory)**
Server bos butuh kunci `labsuser.pem` agar bisa masuk ke server pekerja.
Buka *tab terminal baru* (di laptopmu), lalu kirim file kunci tersebut:
```bash
scp -i labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>:~/labsuser.pem
```
Kembali ke terminal server bos, amankan kuncinya dan buat buku catatan daftar server pekerja (`hosts.ini`):
```bash
chmod 400 ~/labsuser.pem
mkdir -p ~/ansible-jadwal-kuliah/inventory
cd ~/ansible-jadwal-kuliah
nano inventory/hosts.ini
```
Isi dengan teks berikut (ubah `<PRIVATE_IP_DOCKER_HOST>` dengan IP Private server pekerjamu):
```ini
[docker_nodes]
docker-host ansible_host=<PRIVATE_IP_DOCKER_HOST>

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/labsuser.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```
Simpan file (Tekan `Ctrl+O`, `Enter`, lalu `Ctrl+X`).

---

### G. Otomasi Instalasi Docker (Menyuruh Pekerja)
Daripada menginstal Docker manual, kita buat skrip agar Ansible yang mengerjakannya.

**G.1. Membuat Skrip Ansible (`install-docker.yml`)**
Di server bos, buat file baru:
```bash
nano install-docker.yml
```
Salin teks berikut (skrip ini menyuruh pekerja mengupdate sistem dan menginstal Docker):
```yaml
---
- name: Instalasi Docker pada Docker Host
  hosts: docker_nodes
  become: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt: update_cache=true

    - name: Install prerequisite packages
      ansible.builtin.apt:
        name: [apt-transport-https, ca-certificates, curl, software-properties-common, git]
        state: present

    - name: Add Docker GPG apt Key
      ansible.builtin.apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: Add Docker Repository
      ansible.builtin.apt_repository:
        repo: deb https://download.docker.com/linux/ubuntu jammy stable
        state: present

    - name: Install Docker
      ansible.builtin.apt:
        name: [docker-ce, docker-compose-plugin]
        state: present
        update_cache: true

    - name: Pastikan Docker berjalan
      ansible.builtin.service:
        name: docker
        state: started
        enabled: true

    - name: Izinkan user ubuntu menggunakan Docker
      ansible.builtin.user:
        name: ubuntu
        groups: docker
        append: true
```
Simpan file (`Ctrl+O`, `Enter`, `Ctrl+X`).

**G.2. Menjalankan Skrip Instalasi**
Test koneksi terlebih dahulu:
```bash
ansible all -i inventory/hosts.ini -m ping
```
Jika muncul warna hijau (`"ping": "pong"`), jalankan skrip instalasi Docker:
```bash
ansible-playbook -i inventory/hosts.ini install-docker.yml
```
Tunggu sampai proses selesai. Voila! Server pekerjamu sekarang sudah punya Docker.

---

### H. Menjalankan Aplikasi dari GitHub
Sekarang waktunya menghidupkan aplikasi website kita!

**H.1. Membuat Skrip Deployment (`deploy-app.yml`)**
Masih di server bos, buat file satu lagi:
```bash
nano deploy-app.yml
```
Isi dengan skrip berikut (skrip ini menyuruh pekerja mengunduh kode dari GitHub dan menjalankannya):
```yaml
---
- name: Deploy Aplikasi Sistem Informasi Jadwal Kuliah
  hosts: docker_nodes
  tasks:
    - name: Mengunduh source code aplikasi dari GitHub
      ansible.builtin.git:
        repo: 'https://github.com/akun-kamu/repo-jadwal-kuliah.git' # Ganti dengan link repo GitHub kamu
        dest: /home/ubuntu/jadwal-kuliah-app
        update: yes

    - name: Menjalankan aplikasi (Frontend, Backend, Database)
      ansible.builtin.shell: docker compose up -d --build
      args:
        chdir: /home/ubuntu/jadwal-kuliah-app
```
Simpan file.

**H.2. Eksekusi Skrip**
Jalankan perintah ajaib ini:
```bash
ansible-playbook -i inventory/hosts.ini deploy-app.yml
```

---

### I. Verifikasi (Melihat Hasil)
Apakah website kita sudah online? Mari kita cek!

**I.1. Cek Status Server Pekerja**
Dari laptopmu, coba masuk langsung ke server pekerja:
```bash
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_DOCKER_HOST>
docker ps
```
Kamu harusnya melihat 3 program berjalan: `frontend`, `backend`, dan `db`.

**I.2. Lihat Website di Browser**
Buka browser (Google Chrome, Firefox, dll). Ketik `Public IP` dari **Docker Host** milikmu.
`http://<PUBLIC_IP_DOCKER_HOST>`
Jika muncul halaman Jadwal Kuliah, selamat! Kamu baru saja menjadi Cloud Engineer sejati.

---

### J. Cheat Sheet (Perintah Singkat yang Sering Dipakai)
| Perintah | Fungsi |
|---|---|
| `git clone <link>` | Mendownload kode dari GitHub ke server. |
| `docker ps` | Melihat daftar program (container) yang sedang aktif. |
| `docker compose up -d` | Menyalakan aplikasi di latar belakang. |
| `docker compose down` | Mematikan aplikasi. |
| `ansible all -m ping` | Mengecek apakah koneksi antar server lancar. |

---

### K. Troubleshooting (Solusi Jika Ada Error)
* **Error `Permission denied (publickey)` saat SSH:** Pastikan kamu sudah menjalankan `chmod 400 labsuser.pem` agar file kuncimu diizinkan oleh sistem.
* **Error `UNREACHABLE` di Ansible:** Cek file `hosts.ini` kamu, pastikan IP yang dimasukkan adalah **Private IP** dari Docker Host, bukan Public IP.
* **Website tidak bisa dibuka:** Periksa kembali aturan `Security Group`, pastikan Port 80 (HTTP) sudah dibuka.

---

### L. Kesimpulan
Selamat! Di modul ini kamu telah sukses memadukan teknologi canggih masa kini. Kamu menggunakan GitHub untuk menyimpan kode, AWS EC2 untuk komputernya, Docker untuk membungkus aplikasinya agar anti-error, dan Ansible untuk mengotomatisasi semua pekerjaannya. Konsep ini adalah ilmu standar yang sangat banyak digunakan oleh perusahaan teknologi modern.
