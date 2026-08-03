const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ==========================================
// 1. CONFIGURATION & DISCORD WEBHOOK URLS
// ==========================================
// Replace these with your actual Discord Webhook URLs
const DISCORD_WEBHOOKS = {
  DISPATCH: 'YOUR_DISPATCH_WEBHOOK_URL_HERE',
  REGISTRATION: 'YOUR_REGISTRATION_WEBHOOK_URL_HERE',
  WARRANTS: 'YOUR_WARRANTS_WEBHOOK_URL_HERE',
};

// Official ER:LC Public Key for signature verification
const ERLC_PUBLIC_KEY =
  'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';

// ==========================================
// 2. DATABASE SETUP (JSON Storage)
// ==========================================
const DB_FILE = './cad_database.json';
let db = { civilians: [], vehicles: [], warrants: [] };

if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE));
  } catch (err) {
    console.error('Error reading database file:', err);
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ==========================================
// 3. MIDDLEWARE & STATIC FILES
// ==========================================
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to send Discord Webhook messages
async function sendDiscordWebhook(url, payload) {
  if (!url || url.includes('YOUR_')) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Discord Webhook:', err);
  }
}

// ==========================================
// 4. WEBSITE API ENDPOINTS
// ==========================================

// --- Register Civilian ---
app.post('/api/civilian/create', async (req, res) => {
  const { fullName, dob, gender } = req.body;
  if (!fullName || !dob)
    return res.status(400).json({ error: 'Missing required fields' });

  const newCiv = {
    id: Date.now().toString(),
    fullName,
    dob,
    gender: gender || 'Unknown',
  };
  db.civilians.push(newCiv);
  saveDB();

  // Send Discord Notification
  await sendDiscordWebhook(DISCORD_WEBHOOKS.REGISTRATION, {
    username: 'CAD - DMV System',
    embeds: [
      {
        title: '👤 New Civilian Registered',
        color: 3447003,
        fields: [
          { name: 'Full Name', value: fullName, inline: true },
          { name: 'Date of Birth', value: dob, inline: true },
          { name: 'Gender', value: gender, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.json({ success: true, data: newCiv });
});

// --- Register Vehicle ---
app.post('/api/vehicle/register', async (req, res) => {
  const { plate, model, owner } = req.body;
  if (!plate || !model || !owner)
    return res.status(400).json({ error: 'Missing required fields' });

  const cleanPlate = plate.toUpperCase().trim();
  const newVehicle = { plate: cleanPlate, model, owner, stolen: false };
  db.vehicles.push(newVehicle);
  saveDB();

  // Send Discord Notification
  await sendDiscordWebhook(DISCORD_WEBHOOKS.REGISTRATION, {
    username: 'CAD - DMV System',
    embeds: [
      {
        title: '🚘 New Vehicle Registered',
        color: 3066993,
        fields: [
          { name: 'Plate', value: cleanPlate, inline: true },
          { name: 'Model', value: model, inline: true },
          { name: 'Owner', value: owner, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.json({ success: true, data: newVehicle });
});

// --- DMV Plate Search ---
app.get('/api/lookup/plate/:plate', (req, res) => {
  const plate = req.params.plate.toUpperCase().trim();
  const vehicle = db.vehicles.find((v) => v.plate === plate);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

// --- NCIC Person Search ---
app.get('/api/lookup/person/:name', (req, res) => {
  const name = req.params.name.toLowerCase().trim();
  const person = db.civilians.find((c) => c.fullName.toLowerCase() === name);
  if (!person) return res.status(404).json({ error: 'Person not found' });

  const warrants = db.warrants.filter((w) => w.suspect.toLowerCase() === name);
  res.json({ person, warrants });
});

// ==========================================
// 5. IN-GAME ER:LC WEBHOOK RECEIVER
// ==========================================
function verifyERLCSignature(req) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  if (!signature || !timestamp) return false;
  try {
    const pubKeyBuffer = Buffer.from(ERLC_PUBLIC_KEY, 'base64');
    const sigBuffer = Buffer.from(signature, 'hex');
    const msgBuffer = Buffer.concat([
      Buffer.from(timestamp, 'utf8'),
      req.rawBody,
    ]);
    return crypto.verify(null, msgBuffer, pubKeyBuffer, sigBuffer);
  } catch (err) {
    return false;
  }
}

app.post('/api/erlc-webhook', async (req, res) => {
  if (!verifyERLCSignature(req)) {
    return res.status(401).json({ error: 'Invalid ER:LC signature' });
  }

  const event = req.body;

  // Process Emergency Calls
  if (event.type === 'EmergencyCall' || event.call) {
    await sendDiscordWebhook(DISCORD_WEBHOOKS.DISPATCH, {
      username: 'ER:LC In-Game Dispatch',
      embeds: [
        {
          title: `🚨 IN-GAME 911 CALL: ${event.code || 'Emergency'}`,
          color: 15158332,
          fields: [
            { name: 'Caller', value: event.caller || 'Unknown', inline: true },
            {
              name: 'Location',
              value: event.location || 'Unknown',
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  res.status(200).send('Event processed');
});

// ==========================================
// 6. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`✅ All-in-One CAD System running on port ${PORT}`);
});
