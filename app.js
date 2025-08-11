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
    let user = result.rows[0];
    if (user && user.profile_pic) {
      user.profile_pic = `${req.protocol}://${req.get('host')}${user.profile_pic}`;
    }
    res.status(201).json({message: 'Sudo Access granted', data: user})
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
        let user = result.rows[0];
        if (user && user.profile_pic) {
          user.profile_pic = `${req.protocol}://${req.get('host')}${user.profile_pic}`;
        }
        res.status(201).json({message: 'Data Fetched', data: user})
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
        if (user && user.profile_pic) {
          user.profile_pic = `${req.protocol}://${req.get('host')}${user.profile_pic}`;
        }
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
        return res.status(403).json({ message: 'Password Mismatch' });
        }
        return res.status(200).json({status: 'success', message:'Password Matched',data: user})
    }catch(error){
        console.error('Error gettig data:', error);
        res.status(500).json({ error: 'Failed to getting data' });

    }
})

// Delete user by ID
app.delete('/deleteUser/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    res.status(200).json({ message: 'User deleted successfully', user: result.rows[0] });
  if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
  }catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
 
})

//   Get all users
app.get('/getAllUsers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const users = result.rows.map(user => {
      if (user.profile_pic) {
        user.profile_pic = `${serverUrl}${user.profile_pic}`;
      }
      return user;
    });
    res.status(200).json({ message: 'Users fetched successfully', data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user by ID
app.put('/updateUser/:id', upload.single('profile_pic'), async (req, res) => {
  const { id } = req.params;
  const {
    email,
    password,
    phone,
    first_name,
    last_name,
    role,
    gender
  } = req.body;

  let profilePicPath = null;
  if (req.file) {
    profilePicPath = `/uploads/${req.file.filename}`;
  }

  try {
    // Build dynamic update query
    let updateFields = [];
    let values = [];
    let idx = 1;

    if (email) {
      updateFields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }
    if (phone) {
      updateFields.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (first_name) {
      updateFields.push(`first_name = $${idx++}`);
      values.push(first_name);
    }
    if (last_name) {
      updateFields.push(`last_name = $${idx++}`);
      values.push(last_name);
    }
    if (role) {
      updateFields.push(`role = $${idx++}`);
      values.push(role);
    }
    if (gender) {
      updateFields.push(`gender = $${idx++}`);
      values.push(gender);
    }
    if (profilePicPath) {
      updateFields.push(`profile_pic = $${idx++}`);
      values.push(profilePicPath);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    let user = result.rows[0];
    if (user && user.profile_pic) {
      user.profile_pic = `${req.protocol}://${req.get('host')}${user.profile_pic}`;
    }
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});