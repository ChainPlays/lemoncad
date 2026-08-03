const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Vul hier je eigen Discord Webhook in
const DISCORD_WEBHOOK_URL = 'JOUW_DISCORD_WEBHOOK_URL_HIER';

// ER:LC Public Key voor veilige verificatie van de game
const ERLC_PUBLIC_KEY = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';

// Cruciaal: We vangen de 'raw body' op zodat ER:LC veilig kan verifiëren zonder extra bots
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

let dispatches = [];

// --- API: OPHALEN MELDINGEN VOOR DE WEBSITE ---
app.get('/api/dispatches', (req, res) => {
    res.json(dispatches);
});

// --- API: ER:LC EVENT WEBHOOK (GRATIS & DIRECT UIT DE GAME) ---
app.post('/api/erlc/dispatch', async (req, res) => {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing signature headers' });
    }

    try {
        // Valideer de beveiliging van ER:LC
        const sigBuffer = Buffer.from(signature, 'hex');
        const pubKeyBuffer = Buffer.from(ERLC_PUBLIC_KEY, 'base64');
        const message = Buffer.concat([
            Buffer.from(timestamp, 'utf-8'),
            req.rawBody
        ]);

        const isValid = crypto.verify(null, message, {
            key: crypto.createPublicKey({
                key: pubKeyBuffer,
                format: 'der',
                type: 'spki'
            }),
            format: 'der',
            type: 'ed25519'
        }, sigBuffer);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    } catch (err) {
        console.error('Signature verification error:', err);
        return res.status(400).json({ error: 'Invalid request' });
    }

    // Verwerk de in-game ER:LC data
    const erlcData = req.body;
    
    // Kijk of het een emergency call of in-game melding is
    const title = erlcData.title || erlcData.data?.title || 'In-Game Melding';
    const location = erlcData.location || erlcData.data?.location || 'Onbekende locatie';
    const description = erlcData.description || erlcData.data?.description || 'Geen extra details.';
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newDispatch = {
        id: Date.now(),
        title: title,
        location: location,
        description: description,
        priority: 'Emergency',
        time: timeString
    };

    dispatches.unshift(newDispatch);

    // Stuur direct door naar Discord
    await sendDiscordWebhook(newDispatch);

    console.log('🚨 ER:LC melding binnengekomen en verwerkt:', title);
    return res.status(200).json({ success: true });
});

async function sendDiscordWebhook(dispatch) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('JOUW_DISCORD_WEBHOOK')) return;

    const embed = {
        title: `🚨 IN-GAME MELDING: ${dispatch.title}`,
        description: dispatch.description,
        color: 15158332, // Rood
        fields: [
            { name: 'Locatie', value: dispatch.location, inline: true },
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
        console.error('Fout bij versturen Discord webhook:', err);
    }
}

app.listen(PORT, () => {
    console.log(`LemonCAD draait op poort ${PORT}`);
});
