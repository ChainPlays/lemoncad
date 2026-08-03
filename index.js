const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch'); // Of ingebouwd in modernere Node.js versies

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Webhook URL voor meldingen
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1399127814886658098/95yG92Q5X_Nq28U3x6o_s0f9K-78aZ4v6l12kL82vN90m3k12l78z0v3k92l12kL82vN'; // Vervang eventueel met jouw webhook

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tijdelijke geheugen-databases
let civilians = [];
let vehicles = [];
let dispatches = [];

// --- API: BURGERS (CIVILIANS) ---
app.post('/api/civilians', (req, res) => {
    const { name, dob, gender } = req.body;
    if (!name || !dob) {
        return res.status(400).json({ error: 'Name and Date of Birth are required.' });
    }
    const newCiv = { name, dob, gender, id: Date.now() };
    civilians.push(newCiv);
    res.json({ success: true, civilian: newCiv });
});

app.get('/api/civilians/search', (req, res) => {
    const nameQuery = (req.query.name || '').toLowerCase();
    const found = civilians.find(c => c.name.toLowerCase().includes(nameQuery));
    if (found) {
        res.json(found);
    } else {
        res.status(404).json({ error: 'Civilian not found.' });
    }
});

// --- API: VOERTUIGEN (VEHICLES) ---
app.post('/api/vehicles', (req, res) => {
    const { plate, model, owner } = req.body;
    if (!plate || !model) {
        return res.status(400).json({ error: 'Plate and model are required.' });
    }
    const newVeh = { plate: plate.toUpperCase(), model, owner, id: Date.now() };
    vehicles.push(newVeh);
    res.json({ success: true, vehicle: newVeh });
});

app.get('/api/vehicles/search', (req, res) => {
    const plateQuery = (req.query.plate || '').toUpperCase();
    const found = vehicles.find(v => v.plate === plateQuery);
    if (found) {
        res.json(found);
    } else {
        res.status(404).json({ error: 'Vehicle not found.' });
    }
});

// --- API: DISPATCHES (MELDINGEN) ---
app.get('/api/dispatches', (req, res) => {
    res.json(dispatches);
});

app.post('/api/dispatches', async (req, res) => {
    const { title, location, description, priority } = req.body;
    if (!title || !location) {
        return res.status(400).json({ error: 'Title and location are required.' });
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newDispatch = {
        id: Date.now(),
        title,
        location,
        description: description || 'No details provided.',
        priority: priority || 'Normal',
        time: timeString
    };

    dispatches.unshift.apply(dispatches, [newDispatch]); // Zet nieuwe melding bovenaan

    // Stuur automatisch door naar Discord
    await sendDiscordWebhook(newDispatch);

    res.json({ success: true, dispatch: newDispatch });
});

// --- API: ER:LC EXTERNE KOPPELING (SONORAN STIJL) ---
// Dit is het punt waar jouw ER:LC bot/script data naartoe stuurt!
app.post('/api/erlc/dispatch', async (req, res) => {
    const { title, location, description, priority } = req.body;
    if (!title || !location) {
        return res.status(400).json({ error: 'Title and location are required.' });
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newDispatch = {
        id: Date.now(),
        title,
        location,
        description: description || 'Automatic ER:LC in-game dispatch call.',
        priority: priority || 'Emergency',
        time: timeString
    };

    dispatches.unshift(newDispatch);

    // Stuur direct door naar Discord
    await sendDiscordWebhook(newDispatch);

    console.log('🚨 In-game ER:LC dispatch received and broadcasted:', title);
    res.json({ success: true, message: 'Dispatch received and broadcasted successfully.', dispatch: newDispatch });
});

// Functie om Discord Webhook te versturen
async function sendDispatchToLemonCAD(title, location, description, priority) {
    // Interne helper of voor externe aanroepen indien nodig
}

async function sendDiscordWebhook(dispatch) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('jouw_webhook')) return;

    const embed = {
        title: `🚨 NEW DISPATCH CALL: ${dispatch.title}`,
        description: dispatch.description,
        color: dispatch.priority === 'Emergency' ? 15158332 : 16761035, // Rood bij Emergency, anders geel
        fields: [
            { name: 'Location', value: dispatch.location, inline: true },
            { name: 'Priority', value: dispatch.priority, inline: true },
            { name: 'Time', value: dispatch.time, inline: true }
        ],
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (err) {
        console.error('Failed to send Discord webhook:', err);
    }
}

app.listen(PORT, () => {
    console.log(`LemonCAD server is running on port ${PORT}`);
});
