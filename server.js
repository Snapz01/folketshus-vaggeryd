const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Filsökvägar
const DATA_FILE = path.join(__dirname, 'movies.json');
const EVENTS_FILE = path.join(__dirname, 'events.json');
const GALLERY_ORDER_FILE = path.join(__dirname, 'gallery-order.json');
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');
const GALLERY_DIR = path.join(__dirname, 'assets', 'gallery');

// Skapa mappar om de inte finns
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(GALLERY_DIR)) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

// Konfigurera Basic Auth för admin
const adminAuth = basicAuth({
  users: { 'root/admin': 'nicetry' },
  challenge: true,
  realm: 'Folkets Hus Vaggeryd Admin'
});

app.use(cors());
app.use(express.json({ limit: '300mb' }));

// Admin-routing
app.get(['/admin', '/admin.html'], adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Statiska publika filer
app.use(express.static(__dirname, { extensions: ['html'] }));

// ================= API: UPLOAD (AFFISCHER & TRAILERS) =================
app.post('/api/upload', adminAuth, (req, res) => {
  const { imageBase64, fileName } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Ingen fildata' });

  const cleanBase64 = imageBase64.replace(/^data:\w+\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  
  const sanitizedName = (fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeName = `${Date.now()}-${sanitizedName}`;
  const filePath = path.join(UPLOADS_DIR, safeName);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Filskrivfel:', err);
      return res.status(500).json({ error: 'Kunde inte spara filen' });
    }
    res.json({ url: `assets/uploads/${safeName}` });
  });
});

// ================= API: FILMER =================
app.get('/api/movies', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json([]);
      return res.status(500).json({ error: 'Kunde inte läsa movies.json' });
    }
    try {
      res.json(JSON.parse(data || '[]'));
    } catch {
      res.json([]);
    }
  });
});

app.post('/api/movies', adminAuth, (req, res) => {
  const incoming = req.body;

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    let movies = [];
    if (!err && data) {
      try { movies = JSON.parse(data); } catch { movies = []; }
    }

    if (incoming.id) {
      const index = movies.findIndex(m => String(m.id) === String(incoming.id));
      if (index !== -1) {
        movies[index] = { ...movies[index], ...incoming };
      } else {
        movies.push(incoming);
      }
    } else {
      movies.push({
        id: Date.now().toString(),
        ...incoming
      });
    }

    movies.sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time));

    fs.writeFile(DATA_FILE, JSON.stringify(movies, null, 2), 'utf8', (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Kunde inte spara till movies.json' });
      res.status(200).json({ success: true });
    });
  });
});

app.post('/api/movies/:id/delete', adminAuth, (req, res) => {
  const { id } = req.params;
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Läsfel' });

    try {
      let movies = JSON.parse(data || '[]');
      movies = movies.filter(m => String(m.id) !== String(id));

      fs.writeFile(DATA_FILE, JSON.stringify(movies, null, 2), 'utf8', (writeErr) => {
        if (writeErr) return res.status(500).json({ error: 'Skrivfel' });
        res.json({ success: true });
      });
    } catch (parseErr) {
      res.status(500).json({ error: 'Kunde inte tolka datafilen' });
    }
  });
});

// ================= API: EVENTS =================
app.get('/api/events', (req, res) => {
  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
    if (err) return res.json([]);
    try {
      res.json(JSON.parse(data || '[]'));
    } catch {
      res.json([]);
    }
  });
});

app.post('/api/events', adminAuth, (req, res) => {
  const incoming = req.body;

  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
    let events = [];
    if (!err && data) {
      try { events = JSON.parse(data); } catch { events = []; }
    }

    if (incoming.id) {
      const index = events.findIndex(e => String(e.id) === String(incoming.id));
      if (index !== -1) {
        events[index] = { ...events[index], ...incoming };
      } else {
        events.push(incoming);
      }
    } else {
      events.push({
        id: Date.now().toString(),
        ...incoming
      });
    }

    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8', (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Kunde inte spara event' });
      res.status(200).json({ success: true });
    });
  });
});

app.post('/api/events/:id/delete', adminAuth, (req, res) => {
  const eventId = req.params.id;

  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Kunde inte läsa events' });

    let events = [];
    try {
      events = JSON.parse(data);
    } catch {
      events = [];
    }

    const filteredEvents = events.filter(event => String(event.id) !== String(eventId));

    fs.writeFile(EVENTS_FILE, JSON.stringify(filteredEvents, null, 2), 'utf8', (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Kunde inte spara filen' });
      res.json({ success: true });
    });
  });
});

// ================= API: GALLERI (LOKALER) =================

// Read gallery-order.json helper
function getSavedGalleryOrder() {
  if (fs.existsSync(GALLERY_ORDER_FILE)) {
    try {
      const data = fs.readFileSync(GALLERY_ORDER_FILE, 'utf8');
      return JSON.parse(data || '[]');
    } catch {
      return [];
    }
  }
  return [];
}

app.get('/api/gallery', (req, res) => {
  fs.readdir(GALLERY_DIR, (err, files) => {
    if (err) return res.json([]);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
    const savedOrder = getSavedGalleryOrder();

    imageFiles.sort((a, b) => {
      const indexA = savedOrder.indexOf(a);
      const indexB = savedOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    res.json(imageFiles);
  });
});

app.post('/api/gallery/reorder', adminAuth, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Format fɔ di ɔda nɔ kɔrɛkt' });
  }

  fs.writeFile(GALLERY_ORDER_FILE, JSON.stringify(order, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Kunde inte spara gallery-order.json:', err);
      return res.status(500).json({ error: 'Kunde inte spara ordningen' });
    }
    res.json({ success: true });
  });
});

app.post('/api/gallery/upload', adminAuth, (req, res) => {
  const { imageBase64, fileName } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Ingen fildata' });

  const cleanBase64 = imageBase64.replace(/^data:\w+\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  
  const sanitizedName = (fileName || 'gallery-image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeName = `${Date.now()}-${sanitizedName}`;
  const filePath = path.join(GALLERY_DIR, safeName);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Kunde inte spara galleribild:', err);
      return res.status(500).json({ error: 'Kunde inte spara bilden' });
    }

    // Put di nyu pikchɔ na di end fɔ di ɔda list
    const savedOrder = getSavedGalleryOrder();
    savedOrder.push(safeName);
    fs.writeFile(GALLERY_ORDER_FILE, JSON.stringify(savedOrder, null, 2), 'utf8', () => {});

    res.json({ success: true, fileName: safeName });
  });
});

app.post('/api/gallery/:filename/delete', adminAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(GALLERY_DIR, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Kunde inte radera bild:', err);
      return res.status(500).json({ error: 'Kunde inte radera bilden' });
    }

    // Pul di pikchɔ nɛm kɔmɔt na di saved ɔda fayl bak
    const savedOrder = getSavedGalleryOrder().filter(name => name !== filename);
    fs.writeFile(GALLERY_ORDER_FILE, JSON.stringify(savedOrder, null, 2), 'utf8', () => {});

    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`Servern körs på http://localhost:${PORT}`));