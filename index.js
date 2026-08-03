const path = require('path');

// --- 0. Serveer je HTML hoofdpagina ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
const express = require('express');
const app = express();

// Middleware om JSON te lezen
app.use(express.json());

// Database in het geheugen
let db = {
    civilians: [],
    vehicles: []
};

// --- 1. Register Civilian (Matches HTML: /api/civilians) ---
app.post('/api/civilians', (req, res) => {
    const { name, dob, gender } = req.body;
    
    if (!name || !dob) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCiv = { name, dob, gender: gender || 'Unknown' };
    db.civilians.push(newCiv);

    return res.status(200).json({ success: true, civilian: newCiv });
});

// --- 2. Register Vehicle (Matches HTML: /api/vehicles) ---
app.post('/api/vehicles', (req, res) => {
    const { plate, model, owner } = req.body;
    
    if (!plate || !model || !owner) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newVeh = { plate, model, owner };
    db.vehicles.push(newVeh);

    return res.status(200).json({ success: true, vehicle: newVeh });
});

// --- 3. Search Civilian (Matches HTML: /api/civilians/search?name=...) ---
app.get('/api/civilians/search', (req, res) => {
    const searchName = req.query.name ? req.query.name.toLowerCase() : '';
    const civilian = db.civilians.find(c => c.name.toLowerCase().includes(searchName));

    if (civilian) {
        return res.json(civilian);
    } else {
        return res.status(404).json({ error: 'Not found' });
    }
});

// --- 4. Search Vehicle (Matches HTML: /api/vehicles/search?plate=...) ---
app.get('/api/vehicles/search', (req, res) => {
    const searchPlate = req.query.plate ? req.query.plate.toLowerCase() : '';
    const vehicle = db.vehicles.find(v => v.plate.toLowerCase() === searchPlate);

    if (vehicle) {
        return res.json(vehicle);
    } else {
        return res.status(404).json({ error: 'Not found' });
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 LemonCAD Server draait op poort ${PORT}`);
});
