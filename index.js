const express = require('express');
const cors = require('cors');
const pool = require('./db');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Получение списка оборудования
app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM assets ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка сотрудников

// Получение списка сотрудников
app.get('/api/employees', async (req, res) => {
    const result = await pool.query('SELECT * FROM employees ORDER BY full_name');
    res.json(result.rows);
});

// Обновленный POST (с записью в лог)
app.post('/api/assets', async (req, res) => {
    const { title, serial_number, status, employee_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO assets (title, serial_number, status, employee_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, serial_number, status, employee_id]
        );
        const newId = result.rows[0].id;
        
        // Запись в лог
        await pool.query('INSERT INTO asset_logs (asset_id, event_type, description) VALUES ($1, $2, $3)', 
            [newId, 'Создание', `Оборудование добавлено со статусом ${status}`]);
            
        res.status(201).json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// 3. Удаление оборудования
app.delete('/api/assets/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
        res.json({ message: "Удалено" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Генерация QR-кода (Node.js библиотека)
app.get('/api/qrcode', async (req, res) => {
    const { text } = req.query;
    try {
        const qrImage = await QRCode.toDataURL(text);
        res.json({ image: qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка генерации QR' });
    }
});




const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер: http://localhost:${PORT}`));
