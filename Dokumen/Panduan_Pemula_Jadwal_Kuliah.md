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

### E. Struktur dan Pembuatan Komponen Aplikasi (Database, Backend, Frontend)
Sebelum mendeploy aplikasi ke cloud menggunakan Docker dan Ansible, sangat penting bagi kita untuk memahami bagaimana masing-masing komponen aplikasi (Database, Backend, dan Frontend) dibangun dan saling berinteraksi.

Semua kode aplikasi ini disimpan di dalam direktori `aplikasi/`. Berikut adalah struktur berkas dan direktori yang digunakan:
```text
aplikasi/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── database/
│   └── init.sql
├── frontend/
│   ├── app.js
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   └── style.css
└── docker-compose.yml
```

#### E.1. Basis Data (Database)
Database berfungsi sebagai tempat penyimpanan data jadwal kuliah secara aman dan terstruktur. Di sini kita menggunakan basis data relasional **MySQL 8.0**.

* **Inisialisasi Database (`aplikasi/database/init.sql`)**
  Ketika kontainer database pertama kali dinyalakan, berkas SQL ini dieksekusi secara otomatis untuk membuat database, mendefinisikan tabel `jadwal`, dan mengisi beberapa baris data sampel sebagai berikut:
  ```sql
  CREATE DATABASE IF NOT EXISTS jadwal_kuliah;
  USE jadwal_kuliah;

  CREATE TABLE IF NOT EXISTS jadwal (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mata_kuliah VARCHAR(100) NOT NULL,
      dosen VARCHAR(100) NOT NULL,
      ruangan VARCHAR(50) NOT NULL,
      waktu VARCHAR(50) NOT NULL
  );

  INSERT INTO jadwal (mata_kuliah, dosen, ruangan, waktu) VALUES
  ('Komputasi Awan', 'Dr. Budi', 'Lab Komputer 1', 'Senin, 08:00 - 10:30'),
  ('Pemrograman Web', 'Siti M.Kom', 'Lab Komputer 2', 'Selasa, 13:00 - 15:30'),
  ('Kecerdasan Buatan', 'Prof. Joko', 'Ruang 101', 'Rabu, 09:00 - 11:30');
  ```

#### E.2. Sisi Belakang (Backend)
Backend berfungsi menyediakan logika bisnis dan bertindak sebagai jembatan antara Database dan Frontend. Backend dibangun menggunakan **Node.js** dengan framework **Express.js**, serta menggunakan pustaka `mysql2/promise` untuk koneksi non-blocking ke database.

* **Kode Server Utama (`aplikasi/backend/server.js`)**
  Kode ini mendengarkan pada port `3000` (atau port dinamis dari environment), menginisialisasi pool koneksi MySQL, menyediakan endpoint `/api/jadwal` untuk mengembalikan data jadwal kuliah dalam format JSON, serta endpoint `/api/health` untuk memantau kesehatan server backend.
  ```javascript
  const express = require('express');
  const mysql = require('mysql2/promise');
  const cors = require('cors');

  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'jadwal_kuliah'
  };

  let pool;
  async function initDB() {
      pool = mysql.createPool(dbConfig);
      console.log("Database pool created.");
  }
  initDB();

  app.get('/api/jadwal', async (req, res) => {
      try {
          const [rows] = await pool.execute('SELECT * FROM jadwal');
          res.json(rows);
      } catch (error) {
          console.error("Database query failed", error);
          res.status(500).json({ error: 'Database connection failed' });
      }
  });

  app.get('/api/health', (req, res) => {
      res.json({ status: 'OK' });
  });

  app.listen(port, () => {
      console.log(`Backend server running on port ${port}`);
  });
  ```

* **Pengemasan Kontainer (`aplikasi/backend/Dockerfile`)**
  Instruksi pembuatan image kontainer backend berbasis Node.js yang ringan (`node:18-alpine`). Berkas ini menyalin `package.json`, mengunduh dependencies lewat `npm install`, menyalin seluruh kode program backend, serta mengekspos port `3000`.
  ```dockerfile
  FROM node:18-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm install
  COPY . .
  EXPOSE 3000
  CMD ["npm", "start"]
  ```

#### E.3. Sisi Depan (Frontend)
Frontend bertugas menampilkan data jadwal kuliah kepada pengguna dengan antarmuka yang modern, dinamis, dan responsif. Frontend dikembangkan menggunakan **HTML5, CSS3 (Vanilla CSS), dan Vanilla JavaScript (ES6)**, serta disajikan melalui server web **Nginx**.

* **Struktur Tampilan (`aplikasi/frontend/index.html`)**
  Menyediakan kerangka halaman web, termasuk header, area spinner loading, tabel kosong untuk menampung data, serta memuat file CSS dan JS.
  ```html
  <!DOCTYPE html>
  <html lang="id">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sistem Informasi Jadwal Kuliah</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="style.css">
  </head>
  <body>
      <div class="container">
          <header>
              <h1>Jadwal Kuliah</h1>
              <p>Sistem Informasi Akademik Berbasis Cloud</p>
          </header>

          <main>
              <div id="loader" class="loader"></div>
              <div id="error-message" class="error-message" style="display: none;"></div>
              
              <div class="table-container">
                  <table id="jadwal-table" style="display: none;">
                      <thead>
                          <tr>
                              <th>Mata Kuliah</th>
                              <th>Dosen</th>
                              <th>Ruangan</th>
                              <th>Waktu</th>
                          </tr>
                      </thead>
                      <tbody id="jadwal-body">
                          <!-- Data dimasukkan secara dinamis via app.js -->
                      </tbody>
                  </table>
              </div>
          </main>
      </div>

      <script src="app.js"></script>
  </body>
  </html>
  ```

* **Gaya Antarmuka (`aplikasi/frontend/style.css`)**
  Menggunakan CSS modern dengan variabel warna (*CSS Custom Properties*), *backdrop filter* untuk efek kaca buram (*glassmorphism*), gradasi latar belakang radial yang mewah, responsivitas tinggi untuk ponsel/tablet, serta animasi transisi hover yang halus pada tabel data.
  ```css
  :root {
      --primary-color: #4F46E5;
      --primary-hover: #4338CA;
      --bg-color: #0F172A;
      --card-bg: #1E293B;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --border-color: #334155;
      --accent: #38BDF8;
  }

  body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-image: radial-gradient(circle at top right, #1E1B4B, #0F172A);
  }

  .container {
      width: 90%;
      max-width: 1000px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
  }
  /* (Detail CSS lengkap tersedia pada folder aplikasi/frontend/style.css) */
  ```

* **Logika Interaksi Dinamis (`aplikasi/frontend/app.js`)**
  Mengambil data dari endpoint `/api/jadwal`, mengelola state loading, menangani kondisi ketika server error, dan melakukan manipulasi DOM untuk mengisi tabel secara dinamis.
  ```javascript
  document.addEventListener('DOMContentLoaded', () => {
      const table = document.getElementById('jadwal-table');
      const tbody = document.getElementById('jadwal-body');
      const loader = document.getElementById('loader');
      const errorMessage = document.getElementById('error-message');

      const apiUrl = '/api/jadwal';

      fetch(apiUrl)
          .then(response => {
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
              return response.json();
          })
          .then(data => {
              loader.style.display = 'none';
              if (data.length === 0) {
                  errorMessage.textContent = 'Tidak ada jadwal yang tersedia.';
                  errorMessage.style.display = 'block';
                  return;
              }

              data.forEach(item => {
                  const tr = document.createElement('tr');
                  tr.innerHTML = `
                      <td>${item.mata_kuliah}</td>
                      <td>${item.dosen}</td>
                      <td>${item.ruangan}</td>
                      <td>${item.waktu}</td>
                  `;
                  tbody.appendChild(tr);
              });
              table.style.display = 'table';
          })
          .catch(error => {
              console.error('Error fetching data:', error);
              loader.style.display = 'none';
              errorMessage.textContent = 'Gagal memuat jadwal. Pastikan Backend & Database berjalan.';
              errorMessage.style.display = 'block';
          });
  });
  ```

* **Konfigurasi Reverse Proxy Nginx (`aplikasi/frontend/nginx.conf`)**
  Nginx tidak hanya menyajikan berkas frontend statis pada port `80`, tetapi juga beraksi sebagai **Reverse Proxy** untuk meneruskan setiap permintaan ke URL `/api/` langsung ke kontainer `backend` di port `3000`. Hal ini mencegah kegagalan permintaan akibat batasan CORS (*Cross-Origin Resource Sharing*).
  ```nginx
  server {
      listen 80;
      server_name localhost;

      location / {
          root /usr/share/nginx/html;
          index index.html index.htm;
          try_files $uri $uri/ /index.html;
      }

      # Meneruskan panggilan /api ke kontainer backend
      location /api/ {
          proxy_pass http://backend:3000/api/;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }
  }
  ```

* **Pengemasan Kontainer Frontend (`aplikasi/frontend/Dockerfile`)**
  Image ringan berbasis `nginx:alpine` yang bertugas menyalin konfigurasi Nginx dan menyalin semua kode statis frontend ke direktori sajian Nginx (`/usr/share/nginx/html`).
  ```dockerfile
  FROM nginx:alpine
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  COPY . /usr/share/nginx/html
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

#### E.4. Orkestrasi Multi-Kontainer (Docker Compose)
Agar semua komponen di atas dapat saling berkomunikasi di dalam server Docker Host dengan satu kesatuan utuh, kita menggunakan **Docker Compose**.

* **Konfigurasi Utama Orkestrasi (`aplikasi/docker-compose.yml`)**
  Berkas konfigurasi ini mengatur pembuatan kontainer, network jembatan bersama (`jadwal-net`), urutan eksekusi kontainer (`depends_on`), serta pemetaan port host (`80:80`) agar frontend langsung bisa diakses lewat browser.
  ```yaml
  version: '3.8'

  services:
    db:
      image: mysql:8.0
      container_name: jadwal-db
      restart: always
      environment:
        MYSQL_ROOT_PASSWORD: password
        MYSQL_DATABASE: jadwal_kuliah
      volumes:
        - db_data:/var/lib/mysql
        - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
      networks:
        - jadwal-net

    backend:
      build: ./backend
      container_name: jadwal-backend
      restart: always
      environment:
        DB_HOST: db
        DB_USER: root
        DB_PASSWORD: password
        DB_NAME: jadwal_kuliah
        PORT: 3000
      depends_on:
        - db
      networks:
        - jadwal-net

    frontend:
      build: ./frontend
      container_name: jadwal-frontend
      restart: always
      ports:
        - "80:80"
      depends_on:
        - backend
      networks:
        - jadwal-net

  networks:
    jadwal-net:
      driver: bridge

  volumes:
    db_data:
  ```

#### E.5. Menjalankan Aplikasi Secara Lokal (Opsional)
Jika kamu ingin menjalankan dan menguji aplikasi ini langsung di komputer/laptopmu tanpa harus menggunakan server AWS, kamu bisa melakukannya dengan mudah asalkan **Docker Desktop** atau **Docker Compose** sudah terinstal di komputermu.

1. Buka Terminal atau Command Prompt / PowerShell.
2. Masuk ke direktori `aplikasi` di mana file `docker-compose.yml` berada:
   ```bash
   cd aplikasi
   ```
3. Jalankan perintah berikut untuk membangun dan menjalankan semua komponen (Frontend, Backend, dan Database) di latar belakang:
   ```bash
   docker compose up -d --build
   ```
4. Tunggu beberapa saat hingga database siap, lalu buka browser dan akses `http://localhost`. Kamu akan melihat halaman website jadwal kuliah berjalan di komputermu sendiri!
5. Untuk mematikan aplikasi, jalankan:
   ```bash
   docker compose down
   ```

---

### F. Persiapan Infrastruktur AWS (EC2)
Mari kita siapkan server kita di AWS!

**F.1. Membuat Security Group (Firewall)**
Ibarat satpam, Security Group bertugas mengatur siapa saja yang boleh masuk ke server kita.
1. Buka AWS Console, masuk ke menu **EC2** lalu pilih **Security Groups**.
2. Klik **Create security group**.
3. Beri nama: `sg-jadwal-kuliah`.
4. Di bagian **Inbound rules**, tambahkan 3 aturan berikut (pilih source `0.0.0.0/0`):
   - **SSH (Port 22):** Agar kita bisa meremote server dari laptop.
   - **HTTP (Port 80):** Agar website bisa diakses lewat browser.
   - **All traffic:** Untuk source, pilih nama grup ini (`sg-jadwal-kuliah`) agar sesama server kita bisa saling ngobrol.
5. Klik Create.

**F.2. Meluncurkan EC2 Instances**
Lakukan langkah ini **2 kali** untuk membuat 2 server:
1. Klik **Launch instance**.
2. **Name:** Beri nama `ansible-controller` (untuk server pertama) dan `docker-host` (untuk server kedua).
3. **OS (Sistem Operasi):** Pilih Ubuntu Server 24.04 LTS.
4. **Instance type:** Pilih `t2.micro` (gratis/murah).
5. **Key pair:** Pilih `vockey` (atau buat baru jika tidak ada).
6. **Network settings:** Pilih *Select existing security group*, lalu centang `sg-jadwal-kuliah`.
7. Klik **Launch instance**.

**F.3. Mencatat IP Address**
Kembali ke halaman Instances, pastikan keduanya berstatus *Running*. Catat IP mereka:
* `ansible-controller` -> Public IP: `...` | Private IP: `...`
* `docker-host` -> Public IP: `...` | Private IP: `...`

---

### G. Konfigurasi Ansible Controller (Server Bos)
Sekarang kita akan masuk ke server bos dan mengajarinya cara mengontrol server pekerja.

**G.1. Akses SSH ke Ansible Controller**
Buka PowerShell/Terminal di laptopmu, buka folder tempat file `labsuser.pem` berada.
```bash
# Ubah izin file (khusus pengguna Mac/Linux)
chmod 400 labsuser.pem

# Masuk ke server Ansible
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_ANSIBLE_CONTROLLER>
```

**G.2. Instalasi Ansible**
Di dalam terminal server, jalankan perintah ini untuk menginstal Ansible:
```bash
sudo apt update
sudo apt install -y ansible
```

**G.3. Menyiapkan Kunci dan Buku Catatan (Inventory)**
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

### H. Otomasi Instalasi Docker (Menyuruh Pekerja)
Daripada menginstal Docker manual, kita buat skrip agar Ansible yang mengerjakannya.

**H.1. Membuat Skrip Ansible (`install-docker.yml`)**
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

**H.2. Menjalankan Skrip Instalasi**
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

### I. Menjalankan Aplikasi dari GitHub
Sekarang waktunya menghidupkan aplikasi website kita!

**I.1. Membuat Skrip Deployment (`deploy-app.yml`)**
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

**I.2. Eksekusi Skrip**
Jalankan perintah ajaib ini:
```bash
ansible-playbook -i inventory/hosts.ini deploy-app.yml
```

---

### J. Verifikasi (Melihat Hasil)
Apakah website kita sudah online? Mari kita cek!

**J.1. Cek Status Server Pekerja**
Dari laptopmu, coba masuk langsung ke server pekerja:
```bash
ssh -i labsuser.pem ubuntu@<PUBLIC_IP_DOCKER_HOST>
docker ps
```
Kamu harusnya melihat 3 program berjalan: `frontend`, `backend`, dan `db`.

**J.2. Lihat Website di Browser**
Buka browser (Google Chrome, Firefox, dll). Ketik `Public IP` dari **Docker Host** milikmu.
`http://<PUBLIC_IP_DOCKER_HOST>`
Jika muncul halaman Jadwal Kuliah, selamat! Kamu baru saja menjadi Cloud Engineer sejati.

---

### K. Cheat Sheet (Perintah Singkat yang Sering Dipakai)
| Perintah | Fungsi |
|---|---|
| `git clone <link>` | Mendownload kode dari GitHub ke server. |
| `docker ps` | Melihat daftar program (container) yang sedang aktif. |
| `docker compose up -d` | Menyalakan aplikasi di latar belakang. |
| `docker compose down` | Mematikan aplikasi. |
| `ansible all -m ping` | Mengecek apakah koneksi antar server lancar. |

---

### L. Troubleshooting (Solusi Jika Ada Error)
* **Error `Permission denied (publickey)` saat SSH:** Pastikan kamu sudah menjalankan `chmod 400 labsuser.pem` agar file kuncimu diizinkan oleh sistem.
* **Error `UNREACHABLE` di Ansible:** Cek file `hosts.ini` kamu, pastikan IP yang dimasukkan adalah **Private IP** dari Docker Host, bukan Public IP.
* **Website tidak bisa dibuka:** Periksa kembali aturan `Security Group`, pastikan Port 80 (HTTP) sudah dibuka.

---

### M. Kesimpulan
Selamat! Di modul ini kamu telah sukses memadukan teknologi canggih masa kini. Kamu menggunakan GitHub untuk menyimpan kode, AWS EC2 untuk komputernya, Docker untuk membungkus aplikasinya agar anti-error, dan Ansible untuk mengotomatisasi semua pekerjaannya. Konsep ini adalah ilmu standar yang sangat banyak digunakan oleh perusahaan teknologi modern.
