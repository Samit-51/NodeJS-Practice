const express = require('express');
const { createCanvas } = require('canvas');
const mysql = require('mysql');
const QRCode = require('qrcode');
const path = require('path');
const { fs } = require('fs');
const app = express();
const canvas = createCanvas(250, 250);
const con = mysql.createConnection({
    host: "localhost",
    user: "samit",
    password: "1221",
    database: 'mydb'
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/',(req,res)=>{
    res.send('Welcome to the page.');
});
app.get('/hotel/:Hotel_id', (req, res) => {
    const hotelId = req.params.Hotel_id;
    con.query('SELECT * FROM hotels WHERE Hotel_id = ?', [hotelId], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            res.status(400).send('No hotels found.');
            return;
        }
        const hotel = result[0];
        let html = fs.readFileSync(path.join(__dirname, 'body.html'), 'utf8');
        html = html.replace('{{name}}', hotel.Hotel_name);
        html = html.replace('{{hotelId}}', hotelId);
        res.send(html);
    });
});


    con.connect(err => {
    if (err) {
        console.error("Error connecting to MySQL database:", err);
        process.exit(1);
    }
    console.log("Connected to MySQL database!");
});

async function createQR(url) {
    try {
        let canvas = createCanvas(250, 250);
        await QRCode.toCanvas(canvas, url);
        console.log('QRCode created');
        const base64Image = canvas.toDataURL().split(',')[1];
        return base64Image;
    } catch (err) {
        console.error('Error generating QRCode:', err);
        return null;
    }
}

function updateDB(QrCodeImg, Hotel_id) {
    con.query('UPDATE hotels SET QRCode = ? WHERE Hotel_id = ?', [QrCodeImg, Hotel_id], (err, result) => {
        if (err) {
            console.error(`Error updating QRCode for Hotel_id ${Hotel_id}:`, err);
            return;
        }
        console.log(`QRCode updated for Hotel_id: ${Hotel_id}`);
    });
}

async function CheckDB() {
    con.query('SELECT * FROM Hotels WHERE QRCode IS NULL', async (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return;
        }
        for (const row of result) {
            const url = `http://localhost:3000/hotel/${row.Hotel_id}`;
            const QrCodeImg = await createQR(url);
            if (QrCodeImg) {
                updateDB(QrCodeImg, row.Hotel_id);
            }
        }
    });
}
process.on('SIGINT', () => {
    clearInterval(interval);
    con.end(err => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
        } else {
            console.log('MySQL connection closed');
        }
        process.exit();
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web available on http://localhost:${PORT}`));
const interval = setInterval(CheckDB, 500);
