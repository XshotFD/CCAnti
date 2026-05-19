document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('jadwal-table');
    const tbody = document.getElementById('jadwal-body');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');

    // Proxy is handled by Nginx, so we can fetch from /api/jadwal
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
