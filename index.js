const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware voor het paren van JSON en URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serveer statische bestanden vanuit de 'public' map
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

console.log(`Serving static files from: ${publicPath}`);

// Health check endpoint voor Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Fallback route om te controleren of de server draait
app.get('/', (req, res, next) => {
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            res.status(500).send("Server Error: index.html not found in public folder.");
        }
    });
});

// Start de server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`LemonCAD server is running successfully and listening on port ${PORT}`);
});
