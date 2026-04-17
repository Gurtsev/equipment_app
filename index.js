const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

// ── Assets ────────────────────────────────────────────────────────────────────

app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, e.full_name AS employee_name
            FROM assets a
            LEFT JOIN employees e ON a.employee_id = e.id
            ORDER BY a.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/by-serial/:serial', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM assets WHERE serial_number = $1',
            [req.params.serial]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, e.full_name AS employee_name
            FROM assets a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE a.id = $1
        `, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/:id/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, e.full_name AS employee_name
            FROM asset_logs l
            LEFT JOIN employees e ON l.employee_id = e.id
            WHERE l.asset_id = $1
            ORDER BY l.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assets', async (req, res) => {
    const { title, serial_number, status, employee_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO assets (title, serial_number, status, employee_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, serial_number, status, employee_id || null]
        );
        const asset = result.rows[0];
        await pool.query(
            'INSERT INTO asset_logs (asset_id, event_type, description, employee_id) VALUES ($1, $2, $3, $4)',
            [asset.id, 'Создание', `Добавлено со статусом: ${status}`, employee_id || null]
        );
        res.status(201).json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/assets/:id', async (req, res) => {
    const { title, serial_number, status, employee_id } = req.body;
    const { id } = req.params;
    try {
        const prev = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
        if (!prev.rows.length) return res.status(404).json({ error: 'Не найдено' });

        const result = await pool.query(`
            UPDATE assets SET
                title         = COALESCE($1, title),
                serial_number = COALESCE($2, serial_number),
                status        = COALESCE($3, status),
                employee_id   = $4,
                updated_at    = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `, [title, serial_number, status, employee_id ?? prev.rows[0].employee_id, id]);

        const changes = [];
        if (title && title !== prev.rows[0].title) changes.push(`название: ${prev.rows[0].title} → ${title}`);
        if (status && status !== prev.rows[0].status) changes.push(`статус: ${prev.rows[0].status} → ${status}`);
        if (employee_id !== undefined && employee_id !== prev.rows[0].employee_id) changes.push('ответственный изменён');

        await pool.query(
            'INSERT INTO asset_logs (asset_id, event_type, description, employee_id) VALUES ($1, $2, $3, $4)',
            [id, 'Изменение', changes.length ? changes.join('; ') : 'Обновлено', employee_id || null]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assets/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Employees ────────────────────────────────────────────────────────────────

app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY full_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { full_name, department } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO employees (full_name, department) VALUES ($1, $2) RETURNING *',
            [full_name, department || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Projects ─────────────────────────────────────────────────────────────────

app.get('/api/projects', async (req, res) => {
    const { status } = req.query;
    try {
        const result = await pool.query(`
            SELECT p.*,
                COUNT(pa.id) FILTER (WHERE pa.released_at IS NULL) AS asset_count
            FROM projects p
            LEFT JOIN project_assets pa ON pa.project_id = p.id
            ${status ? 'WHERE p.status = $1' : ''}
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, status ? [status] : []);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', async (req, res) => {
    const { name, description, status, started_at, ended_at } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO projects (name, description, status, started_at, ended_at)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description || null, status || 'Активный', started_at || null, ended_at || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (!project.rows.length) return res.status(404).json({ error: 'Не найдено' });

        const assets = await pool.query(`
            SELECT a.*, pa.assigned_at, pa.note, e.full_name AS employee_name
            FROM project_assets pa
            JOIN assets a ON pa.asset_id = a.id
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE pa.project_id = $1 AND pa.released_at IS NULL
            ORDER BY pa.assigned_at DESC
        `, [req.params.id]);

        res.json({ ...project.rows[0], assets: assets.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/projects/:id', async (req, res) => {
    const { name, description, status, started_at, ended_at } = req.body;
    try {
        const result = await pool.query(`
            UPDATE projects SET
                name        = COALESCE($1, name),
                description = COALESCE($2, description),
                status      = COALESCE($3, status),
                started_at  = COALESCE($4, started_at),
                ended_at    = COALESCE($5, ended_at)
            WHERE id = $6
            RETURNING *
        `, [name, description, status, started_at, ended_at, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Project ↔ Assets ─────────────────────────────────────────────────────────

app.post('/api/projects/:id/assets', async (req, res) => {
    const { asset_id, note } = req.body;
    const project_id = req.params.id;
    try {
        // Check asset is not already active in another project
        const busy = await pool.query(
            'SELECT * FROM project_assets WHERE asset_id = $1 AND released_at IS NULL',
            [asset_id]
        );
        if (busy.rows.length) {
            return res.status(409).json({ error: 'Оборудование уже назначено на другой проект' });
        }

        const result = await pool.query(
            'INSERT INTO project_assets (project_id, asset_id, note) VALUES ($1, $2, $3) RETURNING *',
            [project_id, asset_id, note || null]
        );

        await pool.query(
            `UPDATE assets SET status = 'В проекте', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [asset_id]
        );
        await pool.query(
            'INSERT INTO asset_logs (asset_id, event_type, description, project_id) VALUES ($1, $2, $3, $4)',
            [asset_id, 'Назначение', `Добавлено в проект #${project_id}`, project_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id/assets/:assetId', async (req, res) => {
    const { id: project_id, assetId: asset_id } = req.params;
    try {
        await pool.query(
            'UPDATE project_assets SET released_at = NOW() WHERE project_id = $1 AND asset_id = $2 AND released_at IS NULL',
            [project_id, asset_id]
        );
        await pool.query(
            `UPDATE assets SET status = 'На складе', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [asset_id]
        );
        await pool.query(
            'INSERT INTO asset_logs (asset_id, event_type, description, project_id) VALUES ($1, $2, $3, $4)',
            [asset_id, 'Возврат', `Возвращено из проекта #${project_id}`, project_id]
        );

        res.json({ message: 'Освобождено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── QR Code ──────────────────────────────────────────────────────────────────

app.get('/api/qrcode', async (req, res) => {
    const { text } = req.query;
    try {
        const qrImage = await QRCode.toDataURL(text);
        res.json({ image: qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка генерации QR' });
    }
});

// ── SPA fallback (must be after all /api routes) ──────────────────────────────

app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('/{*splat}', (req, res) => {
    const distIndex = path.join(__dirname, 'client', 'dist', 'index.html');
    res.sendFile(distIndex, err => {
        if (err) res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер: http://localhost:${PORT}`));
