import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const ENTRY_FIELDS = [
  'date',
  'location',
  'weather',
  'engine_hours',
  'departure_point',
  'arrival_point',
  'distance_nm',
  'duration_hours',
  'crew',
  'fuel_added_gal',
  'oil_checked',
  'maintenance_notes',
  'notes',
];

function rowToObject(row) {
  // libsql rows support both array-index and column-name access; toJSON gives a plain object.
  return row.toJSON ? row.toJSON() : { ...row };
}

async function getPhotosForEntry(entryId) {
  const result = await db.execute({
    sql: 'SELECT id, filename, created_at FROM photos WHERE entry_id = ? ORDER BY id ASC',
    args: [entryId],
  });
  return result.rows.map(rowToObject);
}

function serializeEntry(row) {
  const obj = rowToObject(row);
  return {
    ...obj,
    oil_checked: !!obj.oil_checked,
    crew: obj.crew ? JSON.parse(obj.crew) : [],
  };
}

function normalizeBody(body) {
  const out = {};
  for (const field of ENTRY_FIELDS) {
    let value = body[field];
    if (field === 'crew') {
      if (Array.isArray(value)) value = JSON.stringify(value);
      else if (typeof value === 'string' && value.trim()) {
        value = JSON.stringify(
          value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      } else value = JSON.stringify([]);
    } else if (field === 'oil_checked') {
      value = value ? 1 : 0;
    } else if (value === undefined || value === '') {
      value = null;
    }
    out[field] = value;
  }
  return out;
}

// List entries, most recent first
app.get('/api/entries', async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT e.*, (
        SELECT p.id FROM photos p WHERE p.entry_id = e.id ORDER BY p.id ASC LIMIT 1
      ) AS cover_photo_id
      FROM entries e
      ORDER BY e.date DESC, e.id DESC
    `);
    res.json(result.rows.map(serializeEntry));
  } catch (err) {
    next(err);
  }
});

// Get single entry with photos
app.get('/api/entries/:id', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [req.params.id],
    });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    const photos = await getPhotosForEntry(req.params.id);
    res.json({ ...serializeEntry(row), photos });
  } catch (err) {
    next(err);
  }
});

// Create entry
app.post('/api/entries', async (req, res, next) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.date) return res.status(400).json({ error: 'date is required' });
    const result = await db.execute({
      sql: `INSERT INTO entries (${ENTRY_FIELDS.join(', ')}) VALUES (${ENTRY_FIELDS.map(() => '?').join(', ')})`,
      args: ENTRY_FIELDS.map((f) => data[f]),
    });
    const created = await db.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [result.lastInsertRowid],
    });
    res.status(201).json({ ...serializeEntry(created.rows[0]), photos: [] });
  } catch (err) {
    next(err);
  }
});

// Update entry
app.put('/api/entries/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM entries WHERE id = ?',
      args: [req.params.id],
    });
    if (!existing.rows[0]) return res.status(404).json({ error: 'Entry not found' });

    const data = normalizeBody(req.body);
    if (!data.date) return res.status(400).json({ error: 'date is required' });
    await db.execute({
      sql: `UPDATE entries SET ${ENTRY_FIELDS.map((f) => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      args: [...ENTRY_FIELDS.map((f) => data[f]), req.params.id],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [req.params.id],
    });
    const photos = await getPhotosForEntry(req.params.id);
    res.json({ ...serializeEntry(updated.rows[0]), photos });
  } catch (err) {
    next(err);
  }
});

// Delete entry (and its photos)
app.delete('/api/entries/:id', async (req, res, next) => {
  try {
    const result = await db.batch(
      [
        { sql: 'DELETE FROM photos WHERE entry_id = ?', args: [req.params.id] },
        { sql: 'DELETE FROM entries WHERE id = ?', args: [req.params.id] },
      ],
      'write'
    );
    const entryDelete = result[1];
    if (Number(entryDelete.rowsAffected) === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Upload photos for an entry
app.post('/api/entries/:id/photos', upload.array('photos', 20), async (req, res, next) => {
  try {
    const entry = await db.execute({
      sql: 'SELECT id FROM entries WHERE id = ?',
      args: [req.params.id],
    });
    if (!entry.rows[0]) return res.status(404).json({ error: 'Entry not found' });

    const files = req.files || [];
    if (files.length > 0) {
      await db.batch(
        files.map((file) => ({
          sql: 'INSERT INTO photos (entry_id, filename, mime_type, data) VALUES (?, ?, ?, ?)',
          args: [req.params.id, file.originalname, file.mimetype, file.buffer],
        })),
        'write'
      );
    }
    const photos = await getPhotosForEntry(req.params.id);
    res.status(201).json(photos);
  } catch (err) {
    next(err);
  }
});

// Serve a photo's raw image bytes
app.get('/api/photos/:photoId/file', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT mime_type, data FROM photos WHERE id = ?',
      args: [req.params.photoId],
    });
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.set('Content-Type', row.mime_type);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(row.data));
  } catch (err) {
    next(err);
  }
});

// Delete a photo
app.delete('/api/photos/:photoId', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM photos WHERE id = ?',
      args: [req.params.photoId],
    });
    if (Number(result.rowsAffected) === 0) return res.status(404).json({ error: 'Photo not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Unexpected error' });
});

// Serve the built React app in production, if present
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Captain's Log server running on port ${PORT}`);
});
