const express = require('express');
const app = express();

// Middleware om JSON-data in verzoeken te kunnen lezen
app.use(express.json());

// Voorbeeld database (array in het geheugen)
let db = {
    civilians: []
};

// Functie om eventueel data op te slaan (pas aan naar jouw eigen database-logica indien nodig)
function saveDB() {
    console.log("Database bijgewerkt. Aantal burgers:", db.civilians.length);
}

// --- --- Register Civilian --- ---
// Zorg dat je frontend formulier zijn data naar deze URL (/api/civilians) stuurt!
app.post('/api/civilians', async (req, res) => {
    const { fullName, dob, gender } = req.body;
    
    if (!fullName || !dob) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCiv = {
        id: Date.now().toString(),
        fullName,
        dob,
        gender: gender || 'Unknown',
    };

    db.civilians.push(newCiv);
    saveDB();

    return res.status(200).json({ success: true, civilian: newCiv });
});

// Extra route om te testen of de server online is en burgers kan opzoeken
app.get('/api/civilians/search', (req, res) => {
    res.json(db.civilians);
});

// --- --- Start de Server --- ---
// Dit is cruciaal zodat Render weet waar hij naar moet luisteren
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 LemonCAD Server draait op poort ${PORT}`);
});
