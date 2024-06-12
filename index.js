const express = require('express');
const { createCanvas } = require('canvas');
const mysql = require('mysql');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs/promises');
const internal = require('stream');
const app = express();
const canvas = createCanvas(250, 250);
const con = mysql.createConnection({
    host: "localhost",
    user: "samit",
    password: "1221",
    database: 'mydb'
});
app.use(express.static(path.join(__dirname, 'public')));

con.connect(async err => {
    if(err) throw err;
    console.log("Connected to MySQL database!");
});

app.get('/', async (req,res)=>{
    try{
        let html = await fs.readFile('public/body.html', 'utf8');
        res.send(html);
    }
    catch(err){
        res.status(500).send('Internal server error.');
    }
});
app.get('/hotel/:id',(req, res) => {
    let hotelId = req.params.id;
    try {
        con.query('SELECT * FROM hotels WHERE Hotel_id = ?',[hotelId], async (err,result)=>{
            if (result.length === 0) {
                return res.send('No hotels found');
            }
            try{
                let hotel = result[0]
                let html = await fs.readFile(path.join(__dirname, 'public/body.html'), 'utf8');
                html = html.replace('{{name}}', hotel.Hotel_name);
                res.send(html);
            }
            catch(err){
                res.status(500).send('Internal server error.');
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error');
    }
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
            const url = `https://localhost:3000/body.html/${row.Hotel_id}`;
            const QrCodeImg = await createQR(url);
            if (QrCodeImg) {
                updateDB(QrCodeImg, row.Hotel_id);
            }
        }
    });
}


const interval = setInterval(CheckDB, 500);
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=> console.log(`Web available at http://localhost:${PORT}/hotel/ABC1070`));