const express = require('express');
const { readFile } = require('fs');
const { createCanvas } = require('canvas');
const mysql = require('mysql');
const QRCode = require('qrcode');
const app = express();
const canvas = createCanvas(250, 250);

app.use(express.static(__dirname));

//Starting sever
app.get('/', (req, res) => {
    readFile('./body.html', 'utf8', (err, html) => {
        if (err) {
            res.send(err);
        }
        res.send(html);
    });
});
//Creating connection with mySQL Database
const con = mysql.createConnection({
    host: "localhost",
    user: "samit",
    password: "1221",
    database: 'mydb'
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to MySQL database!");
});
//Function to generate base64 encoded qrcode image.
async function createQR(url){
    let canvas = createCanvas(250, 250);
    QRCode.toCanvas(canvas, url, function(err){
        if(err){
            console.log('Error generating QRCode');
            return;
        }
        console.log('QRCode created');
    });
    const base64Image = canvas.toDataURL().split(',')[1];
    return base64Image;
}
function updateDB(QrCodeImg,Hotel_id){
    con.query('UPDATE hotels SET QRCode = ? WHERE Hotel_id = ?', [QrCodeImg, Hotel_id], (err, result)=>{
        if(err) throw err;
        console.log(`Qrcode Updated for Hotel_id: ${Hotel_id}`);
    })
}
//Function that checks into db if any of the rows have null value in QRCode field. 
async function CheckDB() {
    con.query('SELECT * FROM Hotels WHERE QRCode IS NULL', async (err, result) => {
        if (err) throw err;
        for (const row of result) {
            const url = `http://localhost:3000/body.html/${row.Hotel_id}`;
            const QrCodeImg = await createQR(url);
            if (QrCodeImg) {
                updateDB(QrCodeImg, row.Hotel_id);
            }
        }
    });
}
const interval= setInterval(CheckDB, 500);
process.on('SIGINT', function() {
    clearInterval(interval);
    con.end(function(err) {
        if (err) throw err;
        console.log('MySQL connection closed');
        process.exit();
    });
});
app.listen(process.env.PORT || 3000, () => console.log('Web available on http://localhost:3000'));
