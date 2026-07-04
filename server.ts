import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json({ limit: '10mb' }));

// In-memory cache
let dbState: Record<string, any> = {};

// Load database
if (fs.existsSync(DB_FILE)) {
  try {
    dbState = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error loading db.json, resetting:', err);
    dbState = {};
  }
}

// REST endpoints
app.get('/api/store-data', (req, res) => {
  res.json(dbState);
});

app.post('/api/store-data', (req, res) => {
  const { key, data } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Missing key' });
  }
  dbState[key] = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving db.json:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
