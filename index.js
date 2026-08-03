var express = require('express');
var path = require('path');

// Maak de app aan
var app = express();

if (!app) {
    console.error("FATAL ERROR: Express app could not be initialized!");
    process.exit(1);
}

// Middleware om JSON-data te lezen
app.use(express.json());

// Zorg dat bestanden in de 'public' map geladen kunnen worden
app.use(express.static(path.join(__dirname, 'public')));

// Database in het geheugen
var db = {
    civilians: [],
    vehicles: [],
    dispatches: []
};

// --- Functie om Discord Webhooks te versturen (Engelstalig) ---
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
                    color: 15158332, // Oranje/Rode kleur voor meldingen
                    fields: fields,
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (error) {
        console.error('Error sending Discord webhook:', error);
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

    await sendDiscordWebhook(
        'New Civilian Registered', 
        'A new civilian has been added to the system.',
        [
            { name: 'Name', value: name, inline: true },
            { name: 'Date of Birth', value: dob, inline: true },
            { name: 'Gender', value: newCiv.gender, inline: true }
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

    await sendDiscordWebhook(
        'New Vehicle Registered', 
        'A new vehicle has been added to the system.',
        [
            { name: 'Plate', value: plate, inline: true },
            { name: 'Model', value: model, inline: true },
            { name: 'Owner', value: owner, inline: true }
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
        return res.status(404).json({ error: 'Civilian not found' });
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
        return res.status(404).json({ error: 'Vehicle not found' });
    }
});

// --- 5. Dispatch: Create new call (Website / Internal) ---
app.post('/api/dispatches', async function(req, res) {
    var title = req.body.title;
    var location = req.body.location;
    var description = req.body.description;
    var priority = req.body.priority;

    if (!title || !location) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var newDispatch = {
        id: Date.now(),
        title: title,
        location: location,
        description: description || 'No description provided',
        priority: priority || 'Normal',
        time: new Date().toLocaleTimeString()
    };

    db.dispatches.unshift(newDispatch);

    await sendDiscordWebhook(
        '🚨 NEW DISPATCH CALL: ' + title,
        description || 'A new emergency call has been dispatched.',
        [
            { name: 'Location', value: location, inline: true },
            { name: 'Priority', value: priority || 'Normal', inline: true },
            { name: 'Time', value: newDispatch.time, inline: true }
        ]
    );

    return res.status(200).json({ success: true, dispatch: newDispatch });
});

// --- 6. ER:LC Inbound Integration (Voor je toekomstige ER:LC Bot / API koppeling) ---
app.post('/api/erlc/dispatch', async function(req, res) {
    // Je kunt hier optioneel een API-key check toevoegen via headers (bijv. req.headers['authorization'])
    var title = req.body.title;
    var location = req.body.location;
    var description = req.body.description;
    var priority = req.body.priority || 'Emergency';

    if (!title || !location) {
        return res.status(400).json({ error: 'Missing required ER:LC dispatch fields' });
    }

    var newDispatch = {
        id: Date.now(),
        title: title,
        location: location,
        description: description || 'In-game automated dispatch call',
        priority: priority,
        time: new Date().toLocaleTimeString()
    };

    db.dispatches.unshift(newDispatch);

    // Stuur direct door naar Discord als in-game melding
    await sendDiscordWebhook(
        '🎮 IN-GAME ER:LC DISPATCH: ' + title,
        description,
        [
            { name: 'Location', value: location, inline: true },
            { name: 'Priority', value: priority, inline: true },
            { name: 'Source', value: 'ER:LC Server', inline: true }
        ]
    );

    return res.status(200).json({ success: true, message: 'ER:LC dispatch received successfully', dispatch: newDispatch });
});

// --- 7. Dispatch: Get all active calls ---
app.get('/api/dispatches', function(req, res) {
    return res.json(db.dispatches);
});

// --- Start Server ---
var PORT = process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log('LemonCAD Server is running on port ' + PORT);
});
