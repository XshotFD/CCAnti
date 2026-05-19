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
