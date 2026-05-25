# KULIAH PRAKTEK KOMPUTASI AWAN
## MODUL IMPLEMENTASI
**Implementasi Website Sistem Informasi Jadwal Kuliah Berbasis Cloud Menggunakan Docker, Ansible, AWS EC2, dan GitHub**

---

### A. Tujuan Pembelajaran
* Memahami konsep komputasi awan (IaaS) dan penggunaan dasar AWS EC2 dari awal.
* Mengonfigurasi arsitektur cloud terpisah untuk Ansible Controller dan Docker Host.
* Mengorkestrasi instalasi Docker Engine menggunakan Ansible.
* Melakukan containerization dan deployment aplikasi Sistem Informasi Jadwal Kuliah secara otomatis menggunakan source code dari GitHub dan Docker Compose.

### B. Latar Belakang
Sistem Informasi Jadwal Kuliah adalah aplikasi kritis yang membutuhkan ketersediaan tinggi dan kemudahan dalam proses pembaruan (deployment). Dengan arsitektur tradisional, konfigurasi environment seringkali berbeda antara mesin developer dan production, menyebabkan masalah (error). 

Pada modul mandiri (independent) ini, kita akan membangun infrastruktur dari nol. Kita menggunakan **Docker** untuk membungkus (containerize) aplikasi agar konsisten di environment mana pun. **Ansible** digunakan untuk mengotomatisasi instalasi Docker di server target tanpa harus mengeksekusi perintah secara manual satu per satu. Terakhir, seluruh source code aplikasi akan diambil dari **GitHub**, yang merepresentasikan alur kerja modern berbasis repositori. Karena modul ini berdiri sendiri, Anda tidak diwajibkan bergantung pada konfigurasi dari modul sebelumnya, melainkan akan melakukan setup instance AWS EC2 langsung dari tahapan awal.

### C. Prasyarat
* Akun AWS Academy / Learner Lab yang aktif.
* Akses Terminal / Command Line (macOS/Linux Terminal, Windows PowerShell, atau Git Bash).
* Koneksi internet yang stabil.
* Akun GitHub dan pemahaman dasar tentang cara kerja Git.

### D. Arsitektur Sistem
Pada praktikum ini, kita akan meluncurkan **dua EC2 Instances** dengan topologi berikut:
1. **Ansible Controller**: Mesin yang digunakan untuk mengontrol dan mengirimkan perintah otomatisasi ke server lain.
2. **Docker Host**: Mesin target yang akan diinstal Docker dan tempat seluruh komponen aplikasi Jadwal Kuliah (Frontend, Backend, dan Database) berjalan sebagai *container*.
3. **Repositori GitHub** sebagai sumber *source code* (Codebase) aplikasi.

---

### E. Persiapan Infrastruktur AWS (EC2)

**E.0. Mengunduh SSH Key (labsuser.pem)**
Agar dapat mengakses server, unduh kunci SSH terlebih dahulu:
1. Buka halaman Vocareum/Learner Lab (bukan AWS Console).
2. Klik tombol **AWS Details** di bagian atas halaman lab.
3. Pada panel yang muncul, klik **Download PEM** (macOS/Linux/Windows PowerShell).
4. Simpan file `labsuser.pem` di lokasi yang mudah diakses (misalnya direktori `Downloads` atau `D:\`).

**E.1. Membuat Security Group**
Security Group berfungsi sebagai firewall untuk instance Anda.
1. Di AWS Console, buka **EC2 Dashboard** -> **Security Groups**.
2. Klik **Create security group**.
3. Isi nama: `sg-jadwal-kuliah`.
4. Tambahkan **Inbound rules** berikut (Source: `0.0.0.0/0` untuk semuanya):
   - **SSH (22)**: Untuk remote akses dari laptop.
   - **HTTP (80)**: Untuk akses web aplikasi Jadwal Kuliah.
   - **All traffic** dengan Source `sg-jadwal-kuliah` (Security Group itu sendiri): Agar instance-instance dalam grup yang sama bisa saling berkomunikasi.

**E.2. Meluncurkan EC2 Instances (Diulang 2 Kali)**
Lakukan langkah berikut 2 kali, masing-masing untuk `ansible-controller` dan `docker-host`:
1. Di EC2 Dashboard, klik **Launch instance**.
2. **Name**: Isi dengan `ansible-controller` (pada instance pertama) dan `docker-host` (pada instance kedua).
3. **OS**: Pilih Ubuntu Server 24.04 LTS (atau 22.04 LTS).
4. **Instance type**: `t2.micro`.
5. **Key pair**: Pilih `vockey`.
6. **Network settings**: Pilih *Select existing security group*, lalu pilih `sg-jadwal-kuliah`.
7. Klik **Launch instance**.

**E.3. Mencatat IP Address**
Catat IP Address dari menu Instances, pastikan berstatus *Running*:
* `ansible-controller` -> Public IP: `...` | Private IP: `...`
* `docker-host` -> Public IP: `...` | Private IP: `...`

---

### F. Konfigurasi Ansible Controller

**F.1. Akses SSH ke Ansible Controller**
Buka PowerShell/Terminal lokal Anda, masuk ke folder tempat `labsuser.pem` berada. Atur *permission* file dan lakukan SSH:
```bash
# Mengatur hak akses file (macOS/Linux)
chmod 400 labsuser.pem

# Masuk ke ansible-controller
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>
```

**F.2. Instalasi Ansible**
Di dalam terminal `ansible-controller`, jalankan perintah instalasi berikut:
```bash
sudo apt update
sudo apt install -y ansible
```

**F.3. Setup Struktur Direktori, Inventory, dan SSH Key**
Agar Ansible Controller dapat mengatur Docker Host, ia membutuhkan file `labsuser.pem`. Buka terminal baru di mesin lokal (jangan tutup sesi SSH) dan salin key tersebut ke controller:
```bash
scp -i labsuser.pem labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>:~/labsuser.pem
```

Kembali ke sesi SSH `ansible-controller`. Ubah permission key dan buat direktori project:
```bash
chmod 400 ~/labsuser.pem
mkdir -p ~/ansible-jadwal-kuliah/inventory
cd ~/ansible-jadwal-kuliah
```

Buat file inventory `inventory/hosts.ini`:
```bash
nano inventory/hosts.ini
```
Isi dengan konfigurasi berikut (ganti `<PRIVATE_IP_DOCKER_HOST>` dengan Private IP Docker Host):
```ini
[docker_nodes]
docker-host ansible_host=<PRIVATE_IP_DOCKER_HOST>

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/labsuser.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```
Simpan dan keluar dari editor (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

### G. Otomasi Instalasi Docker via Ansible

**G.1. Pembuatan Ansible Playbook (`install-docker.yml`)**
Masih di direktori `~/ansible-jadwal-kuliah`, buat file playbook:
```bash
nano install-docker.yml
```
Tulis *task* instalasi Docker Engine & Compose secara otomatis:
```yaml
---
- name: Instalasi Docker pada Docker Host
  hosts: docker_nodes
  become: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true

    - name: Install prerequisite packages
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - software-properties-common
          - git
        state: present

    - name: Add Docker GPG apt Key
      ansible.builtin.apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: Add Docker Repository
      ansible.builtin.apt_repository:
        repo: deb https://download.docker.com/linux/ubuntu jammy stable
        state: present

    - name: Install Docker Engine and Docker Compose Plugin
      ansible.builtin.apt:
        name:
          - docker-ce
          - docker-compose-plugin
        state: present
        update_cache: true

    - name: Pastikan service Docker berjalan
      ansible.builtin.service:
        name: docker
        state: started
        enabled: true

    - name: Tambahkan user ubuntu ke grup docker
      ansible.builtin.user:
        name: ubuntu
        groups: docker
        append: true
```

**G.2. Menjalankan Playbook Instalasi**
Uji koneksi dari Ansible Controller ke Docker Host:
```bash
ansible all -i inventory/hosts.ini -m ping
```
Jika mendapat respon `"ping": "pong"`, eksekusi instalasi Docker:
```bash
ansible-playbook -i inventory/hosts.ini install-docker.yml
```

---

### H. Deployment Aplikasi via GitHub dan Docker

**H.1. Clone Source Code dari GitHub**
Kita akan menggunakan *Ansible Playbook* untuk memerintahkan Docker Host mengunduh (clone) repositori aplikasi dari GitHub dan langsung menjalankannya. Buat file baru:
```bash
nano deploy-app.yml
```

**H.2. Konfigurasi `docker-compose.yml` & Playbook**
Sistem repositori Jadwal Kuliah umumnya memiliki file `docker-compose.yml` yang mengatur service frontend, backend, dan database. Playbook di bawah ini akan memanggil komposisi tersebut. Masukkan *script* berikut:
```yaml
---
- name: Deploy Aplikasi Sistem Informasi Jadwal Kuliah
  hosts: docker_nodes
  tasks:
    - name: Clone repository dari GitHub
      ansible.builtin.git:
        repo: 'https://github.com/dockersamples/example-voting-app.git' # Silahkan ganti URL ini dengan URL Repo Jadwal Kuliah Anda
        dest: /home/ubuntu/jadwal-kuliah-app
        update: yes

    - name: Jalankan aplikasi menggunakan Docker Compose
      ansible.builtin.shell: docker compose up -d
      args:
        chdir: /home/ubuntu/jadwal-kuliah-app
```

**H.3. Eksekusi Docker Compose**
Deploy aplikasi Anda menggunakan perintah berikut:
```bash
ansible-playbook -i inventory/hosts.ini deploy-app.yml
```

---

### I. Verifikasi Hasil Deployment

**I.1. Cek Status Container**
Buka terminal baru di lokal Anda, lalu masuk ke Docker Host menggunakan SSH:
```bash
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_DOCKER_HOST>
docker ps
```
Pastikan seluruh container (frontend, backend, database) berstatus *Up* dan tidak berulang kali restart.

**I.2. Akses Frontend Aplikasi**
Buka *web browser* (seperti Chrome/Firefox), lalu masukkan Public IP dari Docker Host:
```text
http://<PUBLIC_IP_DOCKER_HOST>
```
Jika antarmuka website Sistem Informasi Jadwal Kuliah tampil, maka deployment telah sukses!

---

### J. Perintah yang Berguna (Cheat Sheet)
| Perintah | Deskripsi |
|---|---|
| `git clone <url_repo>` | Mengunduh source code dari repositori GitHub. |
| `git pull` | Mengambil perubahan terbaru dari repositori Git. |
| `docker ps` | Melihat seluruh container yang sedang berjalan. |
| `docker logs <container_id>` | Melihat log (error/info) dari suatu container. |
| `docker compose up -d` | Menjalankan seluruh *service* dari berkas compose di *background*. |
| `docker compose down` | Mematikan dan menghapus semua container terkait aplikasi. |
| `ansible-playbook -i <inventory> <playbook>`| Menjalankan eksekusi otomasi playbook Ansible. |
| `ansible all -m ping` | Menguji konektivitas ke semua host Ansible. |

---

### K. Troubleshooting
Solusi untuk kendala yang mungkin Anda hadapi:
1. **`Permission denied (publickey)` saat SSH**:
   Pastikan Anda sudah menjalankan perintah `chmod 400 labsuser.pem` pada kunci SSH. Periksa juga apakah *username* yang digunakan adalah `ubuntu`.
2. **Error `UNREACHABLE` pada Ansible ping**:
   Periksa konfigurasi IP target di `hosts.ini` (wajib menggunakan Private IP dari Docker Host). Pastikan Security Group telah mengizinkan *All Traffic* dari source Security Group itu sendiri (`sg-jadwal-kuliah`).
3. **Docker Compose command not found / Port conflict**:
   Gunakan penulisan `docker compose` (dengan spasi), karena sistem ini menggunakan *plugin* V2, bukan paket lama `docker-compose`. Apabila terdapat port conflict (contoh pada port 80), pastikan tidak ada layanan lain seperti Nginx *native* yang berjalan pada EC2 Docker Host Anda.

---

### L. Kesimpulan
Pada modul mandiri ini, Anda berhasil membimbing proses *deployment* infrastruktur dari tahap paling dasar, yaitu mendapatkan *credential* AWS, membuat Security Group, hingga mem-provisi EC2 Instance. Secara komprehensif, Anda telah mengintegrasikan empat teknologi utama untuk *production-grade application*: **AWS EC2**, **Ansible**, **Docker**, dan **GitHub**. 

Infrastruktur dan alur yang dipraktikkan ini dapat dengan mudah direplikasi, di-*scale*, dan sangat disarankan untuk skenario nyata pengimplementasian Sistem Informasi Jadwal Kuliah modern.
