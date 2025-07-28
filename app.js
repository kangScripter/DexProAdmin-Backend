const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const pool = require('./db.js')
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const ebook = require('./routes/ebooks.js')

const metricsRoute = require("./routes/metrics");
const blogRoutes = require('./routes/blogRoutes'); 
const newsletterRoutes = require('./routes/newsletter');
require('./scheduler'); // start the cron job

require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

app.use('/ebook', ebook)
app.use('/api/blogs', blogRoutes);
app.use('/api', metricsRoute);
app.use('/api', newsletterRoutes);
app.post('/newUser', upload.single('profile_pic'), async(req , res) => {
   const { 
    email,
    password,
    phone ,
    first_name,
    last_name,
    role,
    gender
    } = req.body;
   // Get profile_pic path if uploaded
   const profilePicPath = req.file ? `/uploads/${req.file.filename}` : null;
   const hashedPassword = await bcrypt.hash(password, 10);
   try {
    const query = `
            INSERT INTO users (email ,password, phone, first_name, last_name, role, gender, profile_pic)
            VALUES ($1 , $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
    `
    const values = [
        email ,
        hashedPassword,
        phone ,
        first_name,
        last_name,
        role,
        gender,
        profilePicPath
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

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});