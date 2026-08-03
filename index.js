const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Jouw ingevulde Discord Webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1533927070810247461/GYeJqyh2D_gLR6J_CNI8zmWqLDYLULmrhKANvtsk2_YcnzRGx_zO2rjzMhHxlchzG-dy';

// ER:LC Public Key voor veilige verificatie van de game
const ERLC_PUBLIC_KEY = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';

// Vang de 'raw body' op zodat ER:LC veilig kan verifiëren
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.static(path.join(__dirname)));

let dispatches = [];

// --- API: OPHALEN MELDINGEN VOOR DE WEBSITE ---
app.get('/api/dispatches', (req, res) => {
    res.json(dispatches);
});

// --- API: ER:LC EVENT WEBHOOK ---
app.post('/api/erlc/dispatch', async (req, res) => {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing signature headers' });
    }

    try {
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

    const erlcData = req.body;
    
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
    console.log(`LemonCAD server draait succesvol op http://localhost:${PORT}`);
});
