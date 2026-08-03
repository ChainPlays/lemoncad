var express = require('express');
var path = require('path');

// Maak de app aan
var app = express();

if (!app) {
    console.error("FATALE FOUT: Express app kon niet worden aangemaakt!");
    process.exit(1);
}

// Middleware om JSON-data te lezen
app.use(express.json());

// Zorg dat bestanden in de 'public' map geladen kunnen worden
app.use(express.static(path.join(__dirname, 'public')));

// Database in het geheugen
var db = {
    civilians: [],
    vehicles: []
};

// --- Functie om Discord Webhooks te versturen ---
async function sendDiscordWebhook(title, description, fields = []) {
    var webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: title,
                    description: description,
                    color: 3447003, // Blauwe kleur
                    fields: fields,
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (error) {
        console.error('Fout bij versturen Discord webhook:', error);
    }
}

// --- 0. Serveer de hoofdpagina vanuit de 'public' map ---
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 1. Register Civilian ---
app.post('/api/civilians', async function(req, res) {
    var name = req.body.name;
    var dob = req.body.dob;
    var gender = req.body.gender;
    
    if (!name || !dob) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var newCiv = { name: name, dob: dob, gender: gender || 'Unknown' };
    db.civilians.push(newCiv);

    // Stuur Discord webhook
    await sendDiscordWebhook(
        'Nieuwe Burger Geregistreerd', 
        'Er is een nieuwe burger toegevoegd aan het systeem.',
        [
            { name: 'Naam', value: name, inline: true },
            { name: 'Geboortedatum', value: dob, inline: true },
            { name: 'Geslacht', value: newCiv.gender, inline: true }
        ]
    );

    return res.status(200).json({ success: true, civilian: newCiv });
});

// --- 2. Register Vehicle ---
app.post('/api/vehicles', async function(req, res) {
    var plate = req.body.plate;
    var model = req.body.model;
    var owner = req.body.owner;
    
    if (!plate || !model || !owner) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var newVeh = { plate: plate, model: model, owner: owner };
    db.vehicles.push(newVeh);

    // Stuur Discord webhook
    await sendDiscordWebhook(
        'Nieuw Voertuig Geregistreerd', 
        'Er is een nieuw voertuig toegevoegd aan het systeem.',
        [
            { name: 'Kenteken', value: plate, inline: true },
            { name: 'Model', value: model, inline: true },
            { name: 'Eigenaar', value: owner, inline: true }
        ]
    );

    return res.status(200).json({ success: true, vehicle: newVeh });
});

// --- 3. Search Civilian ---
app.get('/api/civilians/search', function(req, res) {
    var searchName = req.query.name ? req.query.name.toLowerCase() : '';
    var civilian = db.civilians.find(function(c) {
        return c.name.toLowerCase().includes(searchName);
    });

    if (civilian) {
        return res.json(civilian);
    } else {
        return res.status(404).json({ error: 'Not found' });
    }
});

// --- 4. Search Vehicle ---
app.get('/api/vehicles/search', function(req, res) {
    var searchPlate = req.query.plate ? req.query.plate.toLowerCase() : '';
    var vehicle = db.vehicles.find(function(v) {
        return v.plate.toLowerCase() === searchPlate;
    });

    if (vehicle) {
        return res.json(vehicle);
    } else {
        return res.status(404).json({ error: 'Not found' });
    }
});

// --- Start Server ---
var PORT = process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log('LemonCAD Server draait op poort ' + PORT);
});
