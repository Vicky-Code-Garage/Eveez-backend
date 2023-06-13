const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const mongoose = require('mongoose');
const zohoApiRoutes = require('./routes/zohoApiRoutes.js');
const suscriberRoutes  = require('./routes/suscriberRoutes.js');


dotenv.config()

connectDB()

const app = express()
//middleware bodyparser
app.use(express.json())



app.get('/', (req,res) => {
    res.send('API is running........')
})

//routes
app.use('/api/zoho', zohoApiRoutes);
app.use('/api/subscriber', suscriberRoutes);
app.get('/upload', (req, res) => {
    res.sendFile(__dirname+'/public/index.html');
});

app.get('/upload/customers', (req, res) => {
    res.sendFile(__dirname+'/public/invoice_customer.html');
});

app.get('/upload/single', (req, res) => {
    res.sendFile(__dirname+'/public/single_invoice.html');
});

const PORT = process.env.PORT || 5000
app.listen(PORT, console.log(`Server running on Port ${PORT}`))