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

const PORT = process.env.PORT || 5000
app.listen(PORT, console.log(`Server running on Port ${PORT}`))