const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const pool = require('./db.js')
const path = require('path');

const metricsRoute = require("./routes/metrics");
const blogRoutes = require('./routes/blogRoutes'); 
require('./scheduler'); // start the cron job

require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/blogs', blogRoutes);
app.use('/api', metricsRoute);
app.post('/newUser', async(req , res) => {
   const { 
    email,
    password,
    phone ,
    first_name,
    last_name,
    role,
    gender,
    } = req.body;
   
   const hashedPassword = await bcrypt.hash(password, 10);
   try {
    const query = `
            INSERT INTO users (email ,password, phone, first_name, last_name, role, gender)
            VALUES ($1 , $2, $3, $4, $5, $6, $7)
            RETURNING *;
    `
    const values = [
        email ,
        hashedPassword,
        phone ,
        first_name,
        last_name,
        role,
        gender
    ]
    const result = await pool.query(query, values)
    res.status(201).json({message: 'Sudo Access granted', data: result.rows[0]})
   }catch(error){
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });

   }

})

app.get('/getUser', async(req, res) => {
    const { email } = req.body
    try {
        const query = `SELECT * FROM users WHERE email = ($1)`
        values = [
            email
        ]
        const result = await pool.query(query, values)
        res.status(201).json({message: 'Data Fetched', data: result.rows[0]})
    }catch(error){
        console.error('Error gettig data:', error);
        res.status(500).json({ error: 'Failed to getting data' });

    }
})

app.post('/validatePassword', async(req, res) => {
    const {email,
        password
    } = req.body
    try{
       
        const query = `
        SELECT * FROM users
        WHERE email = ($1);
        `
        values = [
            email
        ]
        const result = await pool.query(query, values)
        if (result.rows.length == 0){return res.status(404).json({ message: 'Account Not found' });}
        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
        return res.status(403).json({ message: 'Password Mismatch' });
        }
        return res.status(200).json({status: 'success', message:'Password Matched',data: result.rows[0]})
    }catch(error){
        console.error('Error gettig data:', error);
        res.status(500).json({ error: 'Failed to getting data' });

    }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});