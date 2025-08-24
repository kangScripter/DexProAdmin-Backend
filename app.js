const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const pool = require('./db.js')
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const ebook = require('./routes/ebooks.js')
const jobRoute = require('./routes/jobRoute.js')
const applicantRoute = require('./routes/applicantRoutes.js')
const serviceRoute = require('./routes/serviceRoutes.js')
const projectRequirementRoutes = require("./routes/projectRequirementRoutes.js");
const metricsRoute = require("./routes/metrics");
const blogRoutes = require('./routes/blogRoutes'); 
const newsletterRoutes = require('./routes/newsletter');
const { formatMediaUrl, uploadSingleFile } = require('./utils/mediaUpload');
require('./scheduler'); // start the cron job

require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Disable response caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Expires', '0');
  res.set('Pragma', 'no-cache');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file upload to /media/images
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaDir = path.join(__dirname, '../media/images');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const mediaUpload = multer({ storage: mediaStorage });

// Email configuration for custom SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.your-domain.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your-email@your-domain.com',
    pass: process.env.EMAIL_PASSWORD || 'your-password'
  },
  tls: {
    rejectUnauthorized: false // Only use this in development
  }
});

// Email sending function
async function sendOTPEmail(email, otp, userName = 'User') {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@dexprosolutions.com',
    to: email,
    subject: 'Password Reset OTP - DexPro Solutions',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Hello ${userName},
          </p>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            You requested a password reset for your DexPro account.
          </p>
          <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px; letter-spacing: 5px;">${otp}</h3>
          </div>
          <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
            <strong>This OTP will expire in 10 minutes.</strong>
          </p>
          <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
            If you didn't request this password reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Best regards,<br>
            DexPro Solutions Team
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Test email configuration endpoint
app.post('/test-email', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required',
      company: 'DexPro'
    });
  }

  try {
    const emailSent = await sendOTPEmail(email, '123456', 'Test User');
    if (emailSent) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        company: 'DexPro',
        data: { 
          email,
          message: 'Please check your email for the test OTP: 123456'
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email',
        company: 'DexPro'
      });
    }
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email test failed',
      company: 'DexPro',
      error: error.message 
    });
  }
});

// Verify email server connection
app.get('/verify-email-server', async (req, res) => {
  try {
    transporter.verify(function(error, success) {
      if (error) {
        console.log('Email server connection failed:', error);
        res.status(500).json({
          success: false,
          message: 'Email server connection failed',
          company: 'DexPro',
          error: error.message
        });
      } else {
        console.log('Email server is ready to send messages');
        res.json({
          success: true,
          message: 'Email server is ready to send messages',
          company: 'DexPro',
          data: {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE,
            user: process.env.EMAIL_USER
          }
        });
      }
    });
  } catch (error) {
    console.error('Email server verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email server verification failed',
      company: 'DexPro',
      error: error.message
    });
  }
});

// Test API endpoint to check database connection
app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    res.json({ 
      connected: true, 
      time: result.rows[0].current_time,
      message: "Database connection successful",
      company: "DexPro"
    });
  } catch (err) {
    console.error('Database connection test error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message,
      message: "Database connection failed",
      company: "DexPro"
    });
  }
});

app.use('/job', jobRoute);
app.use('/applicant', applicantRoute);
app.use('/ebook', ebook)
app.use('/services', serviceRoute);
app.use("/project-requirements", projectRequirementRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api', metricsRoute);
app.use('/api', newsletterRoutes);

app.post('/newUser', mediaUpload.single('profile_pic'), async(req , res) => {
   const { 
    email,
    password,
    phone ,
    first_name,
    last_name,
    role,
    gender
    } = req.body;
   
   // Validate required fields
   if (!email || !password || !phone || !first_name || !last_name || !role || !gender) {
     return res.status(400).json({ 
       success: false, 
       error: 'All fields are required', 
       company: 'DexPro' 
     });
   }

   // Convert role to integer and validate
   let roleInt;
   try {
     roleInt = parseInt(role);
     if (isNaN(roleInt)) {
       return res.status(400).json({ 
         success: false, 
         error: 'Role must be a valid number (1 for admin, 2 for user)', 
         company: 'DexPro' 
       });
     }
   } catch (error) {
     return res.status(400).json({ 
       success: false, 
       error: 'Invalid role format', 
       company: 'DexPro' 
     });
   }
   
   let profilePicUrl = null;
   if (req.file) {
     try {
       profilePicUrl = await uploadSingleFile(req.file, 'profile_pic');
     } catch (uploadErr) {
       console.error('Error uploading profile picture:', uploadErr);
       return res.status(500).json({ success: false, error: 'Failed to upload profile picture', company: 'DexPro' });
     }
   }
   
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
        roleInt, // Use the converted integer
        gender,
        profilePicUrl
    ]
    const result = await pool.query(query, values)
    let user = result.rows[0];
    
    // Format profile picture URL in response
    if (user.profile_pic) {
      user.profile_pic = formatMediaUrl(user.profile_pic);
    }
    
    res.status(201).json({
      success: true,
      message: 'Sudo Access granted',
      company: 'DexPro',
      data: user
    })
   }catch(error){
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: 'Failed to save data', company: 'DexPro' });
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
        
        // Format profile picture URL
        if (user && user.profile_pic) {
          user.profile_pic = formatMediaUrl(user.profile_pic);
        }
        
        res.status(201).json({message: 'Data Fetched', data: user})
    }catch(error){
        console.error('Error getting data:', error);
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
        
        // Format profile picture URL
        if (user && user.profile_pic) {
          user.profile_pic = formatMediaUrl(user.profile_pic);
        }
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
        return res.status(403).json({ message: 'Password Mismatch' });
        }
        return res.status(200).json({status: 'success', message:'Password Matched',data: user})
    }catch(error){
        console.error('Error getting data:', error);
        res.status(500).json({ error: 'Failed to getting data' });
    }
})

// Get user by id
app.get('/getUserById/:id', async(req, res) => {
  const { id } = req.params;
  try {
    const query = `SELECT * FROM users WHERE id = ($1)`
    values = [id]
    const result = await pool.query(query, values)
    let user = result.rows[0];
    if (user && user.profile_pic) {
      user.profile_pic = formatMediaUrl(user.profile_pic);
    }
    res.status(200).json({message: 'User fetched successfully', data: user})
  }catch(error){
    console.error('Error getting data:', error);
    res.status(500).json({ error: 'Failed to getting data' });
  }
})

// Delete user by ID
app.delete('/deleteUser/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let user = result.rows[0];
    // Format profile picture URL in response
    if (user.profile_pic) {
      user.profile_pic = formatMediaUrl(user.profile_pic);
    }
    
    res.status(200).json({ message: 'User deleted successfully', user });
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
    
    // Format profile picture URLs for all users
    const users = result.rows.map(user => {
      if (user.profile_pic) {
        user.profile_pic = formatMediaUrl(user.profile_pic);
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
app.put('/updateUser/:id', mediaUpload.single('profile_pic'), async (req, res) => {
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

  let profilePicUrl = null;
  if (req.file) {
    try {
      profilePicUrl = await uploadSingleFile(req.file, 'profile_pic');
    } catch (uploadErr) {
      console.error('Error uploading profile picture:', uploadErr);
      return res.status(500).json({ success: false, error: 'Failed to upload profile picture', company: 'DexPro' });
    }
  }

  try {
    let updateFields = [];
    let values = [];
    let idx = 1;

    if (email !== undefined && email !== '') {
      updateFields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (password !== undefined && password !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }
    if (phone !== undefined && phone !== '') {
      updateFields.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (first_name !== undefined && first_name !== '') {
      updateFields.push(`first_name = $${idx++}`);
      values.push(first_name);
    }
    if (last_name !== undefined && last_name !== '') {
      updateFields.push(`last_name = $${idx++}`);
      values.push(last_name);
    }
    if (role !== undefined && role !== '' && !isNaN(role)) {
      updateFields.push(`role = $${idx++}`);
      values.push(Number(role));
    }
    if (gender !== undefined && gender !== '') {
      updateFields.push(`gender = $${idx++}`);
      values.push(gender);
    }
    if (profilePicUrl) {
      updateFields.push(`profile_pic = $${idx++}`);
      values.push(profilePicUrl);
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
    // Format profile picture URL in response
    if (user.profile_pic) {
      user.profile_pic = formatMediaUrl(user.profile_pic);
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      company: 'DexPro',
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user', company: 'DexPro' });
  }
});

// Generate OTP function
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Forgot Password API - Send OTP
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required',
      company: 'DexPro' 
    });
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User with this email does not exist',
        company: 'DexPro' 
      });
    }

    const user = userResult.rows[0];

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes from now

    // Store OTP in database
    await pool.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3',
      [otp, otpExpiry, email]
    );

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, user.first_name || 'User');

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
        company: 'DexPro'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      company: 'DexPro',
      data: {
        email: user.email,
        message: 'Please check your email for the 6-digit OTP'
      }
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP',
      company: 'DexPro' 
    });
  }
});

// Verify OTP API
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and OTP are required',
      company: 'DexPro' 
    });
  }

  try {
    // Check if OTP is valid and not expired
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_otp = $2 AND reset_otp_expiry > NOW()',
      [email, otp]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP',
        company: 'DexPro' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      company: 'DexPro',
      data: {
        email: userResult.rows[0].email,
        verified: true,
        message: 'OTP is valid. You can now reset your password.'
      }
    });

  } catch (error) {
    console.error('Error in verify OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP',
      company: 'DexPro' 
    });
  }
});

// Reset Password API
app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, OTP, and new password are required',
      company: 'DexPro' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 6 characters long',
      company: 'DexPro' 
    });
  }

  try {
    // Check if user exists and has valid OTP
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_otp = $2 AND reset_otp_expiry > NOW()',
      [email, otp]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP',
        company: 'DexPro' 
      });
    }

    const user = userResult.rows[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await pool.query(
      'UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expiry = NULL, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      company: 'DexPro',
      data: {
        email: user.email,
        message: 'You can now login with your new password'
      }
    });

  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password',
      company: 'DexPro' 
    });
  }
});

// Resend OTP API
app.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required',
      company: 'DexPro' 
    });
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User with this email does not exist',
        company: 'DexPro' 
      });
    }

    const user = userResult.rows[0];

    // Generate new 6-digit OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes from now

    // Update OTP in database
    await pool.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3',
      [otp, otpExpiry, email]
    );

    // Send new OTP via email
    const emailSent = await sendOTPEmail(email, otp, user.first_name || 'User');

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
        company: 'DexPro'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully',
      company: 'DexPro',
      data: {
        email: user.email,
        message: 'Please check your email for the new 6-digit OTP'
      }
    });

  } catch (error) {
    console.error('Error in resend OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend OTP',
      company: 'DexPro' 
    });
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});