# KULIAH PRAKTEK KOMPUTASI AWAN
## MODUL PRAKTIKUM
**Implementasi Website Sistem Informasi Jadwal Kuliah Berbasis Cloud Menggunakan Docker, Ansible, AWS EC2, dan GitHub**

---

### A. Tujuan Pembelajaran
Setelah menyelesaikan modul ini, mahasiswa diharapkan mampu:
1. Memahami konsep containerization menggunakan Docker dan Docker Compose.
2. Membangun dan mengonfigurasi arsitektur cloud menggunakan AWS EC2.
3. Mengorkestrasi instalasi perangkat lunak pada server cloud menggunakan Ansible.
4. Melakukan deployment aplikasi berbasis web (Sistem Informasi Jadwal Kuliah) menggunakan source code dari GitHub.

### B. Latar Belakang
Sistem Informasi Jadwal Kuliah adalah aplikasi kritis yang membutuhkan ketersediaan tinggi dan kemudahan dalam proses pembaruan (deployment). Dengan arsitektur tradisional, konfigurasi environment seringkali berbeda antara mesin *developer* dan *production*, menyebabkan masalah (error). 

Pada modul ini, kita menggunakan **Docker** untuk membungkus (containerize) aplikasi agar konsisten di environment mana pun. **Ansible** digunakan untuk mengotomatisasi instalasi Docker di server target tanpa harus mengeksekusi perintah secara manual satu per satu. Terakhir, seluruh source code aplikasi akan diambil dari **GitHub**, yang merepresentasikan alur kerja modern berbasis repositori.

### C. Prasyarat
* Modul sebelumnya (Dasar AWS EC2 dan Ansible) telah diselesaikan.
* Akses ke AWS Academy Learner Lab sudah tersedia.
* File `labsuser.pem` sudah diunduh dari halaman Learner Lab ke mesin lokal Anda.
* Terminal tersedia (macOS/Linux Terminal, Windows PowerShell, atau Git Bash).
* Koneksi internet stabil.

### D. Arsitektur Sistem
Sistem yang dibangun memiliki spesifikasi aplikasi dan infrastruktur sebagai berikut:

**D.1. Arsitektur Aplikasi**
Proyek aplikasi Sistem Informasi Jadwal Kuliah yang akan di-deploy harus terdiri dari tiga komponen utama:
1. **Front End:** Antarmuka pengguna (user interface) untuk interaksi sistem.
2. **Back End:** Layanan server (API) untuk pemrosesan logika bisnis aplikasi.
3. **Database:** Basis data untuk penyimpanan informasi jadwal kuliah secara persisten.

**D.2. Arsitektur Infrastruktur**
Pada praktikum ini, kita akan meluncurkan **dua EC2 Instances**:
1. **Ansible Controller:** Mesin yang digunakan untuk mengontrol dan mengirimkan perintah otomatisasi.
2. **Docker Host:** Mesin target yang akan diinstal Docker dan tempat seluruh komponen aplikasi Jadwal Kuliah berjalan (sebagai container).

---

### E. Persiapan Infrastruktur AWS (EC2)

**E.1. Membuat Security Group**
Security Group berfungsi sebagai firewall. 
1. Di AWS Console, buka **EC2 Dashboard** -> **Security Groups**.
2. Klik **Create security group**.
3. Isi nama: `sg-jadwal-kuliah`.
4. Tambahkan **Inbound rules** berikut (Source: `0.0.0.0/0` untuk semuanya):
   - **SSH (22)**: Untuk remote akses.
   - **HTTP (80)**: Untuk akses web aplikasi Jadwal Kuliah.
   - **All traffic** dengan Source `sg-jadwal-kuliah` (Security Group itu sendiri): Agar instance bisa saling berkomunikasi.

**E.2. Meluncurkan EC2 Instances (Diulang 2 Kali)**
Lakukan langkah berikut 2 kali, masing-masing untuk `ansible-controller` dan `docker-host`:
1. Klik **Launch instance**.
2. **Name**: Isi dengan `ansible-controller` (pada instance pertama) dan `docker-host` (pada instance kedua).
3. **OS**: Pilih Ubuntu Server 24.04 LTS (atau 22.04 LTS).
4. **Instance type**: `t2.micro`.
5. **Key pair**: Pilih `vockey`.
6. **Network settings**: Pilih *Select existing security group*, lalu pilih `sg-jadwal-kuliah`.
7. Klik **Launch instance**.

**E.3. Mencatat IP Address**
Catat IP Address dari menu Instances:
* `ansible-controller` -> Public IP: `...` | Private IP: `...`
* `docker-host` -> Public IP: `...` | Private IP: `...`

---

### F. Konfigurasi Ansible Controller

**F.1. Akses SSH ke Ansible Controller dari Lokal**
Buka PowerShell/Terminal lokal Anda, masuk ke folder tempat `labsuser.pem` berada, dan jalankan:
```bash
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>
```

**F.2. Instalasi Ansible**
Di dalam terminal `ansible-controller`, jalankan perintah berikut:
```bash
sudo apt update
sudo apt install -y ansible
```

**F.3. Salin labsuser.pem ke Ansible Controller**
Buka terminal baru di mesin lokal Anda (jangan tutup sesi SSH controller), lalu salin key:
```bash
scp -i labsuser.pem labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>:~/labsuser.pem
```

**F.4. Setup Direktori dan Inventory**
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
Isi dengan konfigurasi berikut (ganti `<PRIVATE_IP_DOCKER_HOST>` dengan Private IP yang dicatat di E.3):
```ini
[docker_nodes]
docker-host ansible_host=<PRIVATE_IP_DOCKER_HOST>

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/labsuser.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```
Simpan file (Ctrl+O, Enter, Ctrl+X).

---

### G. Otomasi Instalasi Docker via Ansible

**G.1. Pembuatan Ansible Playbook**
Masih di direktori `~/ansible-jadwal-kuliah`, buat file playbook:
```bash
nano install-docker.yml
```
Isi dengan playbook berikut:
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
Simpan file.

**G.2. Menjalankan Playbook Instalasi**
Test koneksi terlebih dahulu:
```bash
ansible all -i inventory/hosts.ini -m ping
```
Jika sukses (`"ping": "pong"`), jalankan playbook:
```bash
ansible-playbook -i inventory/hosts.ini install-docker.yml
```
Tunggu hingga proses selesai tanpa pesan `failed`.

---

### H. Deployment Aplikasi via GitHub dan Docker Compose

Kali ini, kita akan mendeploy aplikasi menggunakan *ansible shell module* dari Controller untuk memerintahkan Docker Host melakukan git clone dan menjalankan docker compose.

Buat playbook baru bernama `deploy-app.yml`:
```bash
nano deploy-app.yml
```
Isi dengan kode berikut:
```yaml
---
- name: Deploy Aplikasi Sistem Informasi Jadwal Kuliah
  hosts: docker_nodes
  tasks:
    - name: Clone repository dari GitHub
      ansible.builtin.git:
        repo: 'https://github.com/dockersamples/example-voting-app.git' # Contoh repo, bisa diganti dengan repo jadwal kuliah
        dest: /home/ubuntu/jadwal-kuliah-app
        update: yes

    # Catatan: Jika repo tidak memiliki docker-compose.yml, kita bisa membuatnya menggunakan modul copy.
    # Namun karena kita asumsikan repo sudah memilikinya, kita langsung jalankan.

    - name: Jalankan aplikasi menggunakan Docker Compose
      ansible.builtin.shell: docker compose up -d
      args:
        chdir: /home/ubuntu/jadwal-kuliah-app
```
*(Catatan: Anda dapat mengubah URL repository GitHub pada script di atas sesuai dengan repository aplikasi Jadwal Kuliah kelompok Anda yang memiliki `docker-compose.yml`)*

Jalankan playbook deployment:
```bash
ansible-playbook -i inventory/hosts.ini deploy-app.yml
```

---

### I. Verifikasi Hasil Deployment

**I.1. Cek Status Container**
SSH langsung ke mesin `docker-host` dari lokal Anda menggunakan Public IP:
```bash
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_DOCKER_HOST>
```
Lalu jalankan:
```bash
docker ps
```
Pastikan status container `Up` dan melihat port mapping (contoh: `0.0.0.0:80->80/tcp`).

**I.2. Akses Frontend Aplikasi**
Buka browser dan ketikkan Public IP dari `docker-host`:
```
http://<PUBLIC_IP_DOCKER_HOST>
```
Jika halaman web aplikasi muncul, selamat! Deployment infrastruktur terotomatisasi Anda berhasil.

---

### J. Perintah yang Berguna
| Perintah | Deskripsi |
|---|---|
| `ansible-playbook -i inventory/hosts.ini <file.yml>` | Menjalankan playbook. |
| `docker ps` | Melihat container yang sedang berjalan. |
| `docker compose up -d` | Menjalankan service dari compose file di background. |
| `docker compose down` | Mematikan dan menghapus container. |
| `git clone <url_repo>` | Mengunduh source code dari repositori GitHub. |

---

### K. Troubleshooting
1. **Error: Permission denied (publickey)**: 
   Pastikan Anda sudah melakukan `chmod 400 labsuser.pem` pada kunci SSH Anda, baik di lokal maupun di controller.
2. **Error: UNREACHABLE saat ansible ping**:
   Pastikan IP target yang ditulis di `hosts.ini` sudah benar (Private IP Docker Host). Pastikan Security Group telah mengizinkan All Traffic antar instance di group yang sama.
3. **Docker Compose command not found**:
   Pastikan penulisan adalah `docker compose` (menggunakan spasi), bukan `docker-compose` (versi lama), karena plugin Docker Compose V2 telah terinstal melalui playbook.

### L. Kesimpulan
Pada modul ini, Anda berhasil mengintegrasikan empat teknologi utama (AWS EC2, Ansible, Docker, dan GitHub). Anda membuat Ansible Controller yang mendelegasikan perintah instalasi Docker secara otomatis ke Docker Host, lalu mengambil source code aplikasi dari GitHub dan menjalankannya menggunakan Docker Compose. Infrastruktur semacam ini sangat direkomendasikan untuk sistem production berskala modern.
