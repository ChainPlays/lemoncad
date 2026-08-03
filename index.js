var express = require('express');
var path = require('path');

// Maak direct de app aan
var app = express();

// Controleer voor de zekerheid of app bestaat
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

// --- 0. Serveer de hoofdpagina vanuit de 'public' map ---
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 1. Register Civilian ---
app.post('/api/civilians', function(req, res) {
    var name = req.body.name;
    var dob = req.body.dob;
    var gender = req.body.gender;
    
    if (!name || !dob) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var newCiv = { name: name, dob: dob, gender: gender || 'Unknown' };
    db.civilians.push(newCiv);

    return res.status(200).json({ success: true, civilian: newCiv });
});

// --- 2. Register Vehicle ---
app.post('/api/vehicles', function(req, res) {
    var plate = req.body.plate;
    var model = req.body.model;
    var owner = req.body.owner;
    
    if (!plate || !model || !owner) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var newVeh = { plate: plate, model: model, owner: owner };
    db.vehicles.push(newVeh);

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
