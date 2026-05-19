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

// Polling connection until DB is ready
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
