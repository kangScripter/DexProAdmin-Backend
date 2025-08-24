# DexPro Admin Backend - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Setup & Installation](#setup--installation)
4. [API Documentation](#api-documentation)
5. [Email Setup](#email-setup)
6. [Password Reset System](#password-reset-system)
7. [Media Upload Integration](#media-upload-integration)
8. [Database Schema](#database-schema)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

DexPro Admin Backend is a comprehensive Node.js application built with Express.js and PostgreSQL, designed to manage various aspects of the DexPro business including user management, blog posts, job applications, ebooks, and more.

### Key Features
- **User Management**: Complete CRUD operations with profile pictures
- **Blog Management**: Create, read, update, and delete blog posts with featured images
- **Job Applications**: Handle job applications with resume uploads
- **Ebook Management**: Upload and manage ebooks with images and PDFs
- **Email Integration**: OTP-based password reset system
- **Media Management**: Centralized media upload service integration
- **Metrics & Analytics**: Dashboard metrics and featured content

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **File Upload**: Multer with centralized media service
- **Email**: Nodemailer with SMTP support
- **Authentication**: bcrypt for password hashing
- **Scheduling**: node-cron for automated tasks

---

## Project Structure

```
DexProAdmin-Backend/
├── app.js                      # Main application file
├── db.js                       # Database connection
├── createTables.js             # Database schema creation
├── scheduler.js                # Automated task scheduler
├── package.json                # Dependencies and scripts
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Docker image definition
├── .env                        # Environment variables (not in repo)
├── .gitignore                  # Git ignore rules
├── controllers/                # Business logic controllers
│   └── blogsController.js      # Blog management logic
├── routes/                     # API route definitions
│   ├── applicantRoutes.js      # Job application routes
│   ├── blogRoutes.js           # Blog management routes
│   ├── ebooks.js               # Ebook management routes
│   ├── jobRoute.js             # Job posting routes
│   ├── metrics.js              # Analytics routes
│   ├── newsletter.js           # Newsletter routes
│   ├── projectplanner.js       # Project planning routes
│   ├── projectRequirementRoutes.js # Project requirements
│   └── serviceRoutes.js        # Service management routes
├── utils/                      # Utility functions
│   └── mediaUpload.js          # Media upload utilities
└── uploads/                    # Temporary file storage (gitignored)
```

---

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DexProAdmin-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=dexpro_admin
   DB_USER=postgres
   DB_PASSWORD=your_db_password

   # Email Configuration
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Media Service
   MEDIA_SERVICE_URL=https://media.dexprosolutions.com
   ```

4. **Database Setup**

   **For Local Development:**
   ```bash
   # Create database
   createdb dexpro_admin

   # Fix UUID generation issue (if needed)
   psql dexpro_admin -f fix_pgcrypto.sql

   # Run database schema
   node createTables.js
   ```

   **For cPanel Hosting:**
   ```sql
   -- Option 1: Use uuid-ossp extension (if available)
   -- Copy and paste the contents of cpanel_tables.sql into your cPanel PostgreSQL interface

   -- Option 2: Use SERIAL IDs (most compatible)
   -- Copy and paste the contents of cpanel_tables_serial.sql into your cPanel PostgreSQL interface
   ```

5. **Start the server**
   ```bash
   npm start
   ```

### Docker Setup (Alternative)

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Or build Docker image manually**
   ```bash
   docker build -t dexpro-admin-backend .
   docker run -p 3000:3000 dexpro-admin-backend
   ```

---

## API Documentation

### Base URL
```
http://localhost:3000/
```

### Authentication Endpoints

#### Create New User
- **Endpoint:** `POST /newUser`
- **Description:** Register a new user with profile picture
- **Request Body (form-data):**
  - `email` (string, required)
  - `password` (string, required)
  - `phone` (string, required)
  - `first_name` (string, required)
  - `last_name` (string, required)
  - `role` (integer, required) - 1 for admin, 2 for user
  - `gender` (string, required)
  - `profile_pic` (file, optional)
- **Response:** `201 Created` with user object

#### Get User by Email
- **Endpoint:** `GET /getUser`
- **Description:** Fetch user by email
- **Request Body (JSON):**
  - `email` (string, required)
- **Response:** `200 OK` with user object

#### Validate User Password
- **Endpoint:** `POST /validatePassword`
- **Description:** Validate user password
- **Request Body (JSON):**
  - `email` (string, required)
  - `password` (string, required)
- **Response:** `200 OK` if valid, `403 Forbidden` if invalid

### Blog Management Endpoints

#### Create Blog
- **Endpoint:** `POST /api/blogs`
- **Description:** Create new blog post with featured image
- **Request Body (form-data):**
  - `title` (string, required)
  - `short_desc` (string, required)
  - `content` (string, required)
  - `status` (string, required)
  - `scheduled_time` (string, optional)
  - `category` (string, required)
  - `tags` (string, comma-separated, optional)
  - `seo_title` (string, optional)
  - `seo_description` (string, optional)
  - `seo_keyword` (string, optional)
  - `featured_image` (file, optional)
- **Response:** `201 Created` with blog object

#### Get Blog by ID
- **Endpoint:** `GET /api/blogs/:id`
- **Description:** Fetch blog post by ID
- **Response:** `200 OK` with blog object

### Job Application Endpoints

#### Submit Application
- **Endpoint:** `POST /api/applicants/save/:jobId`
- **Description:** Submit job application with resume
- **Request Body (form-data):**
  - `name` (string, required)
  - `email` (string, required)
  - `phone` (string, required)
  - `coverLetter` (string, optional)
  - `resumePDF` (file, required)
- **Response:** `201 Created` with application object

#### Get All Applications
- **Endpoint:** `GET /api/applicants/get`
- **Description:** Fetch all job applications with job titles
- **Response:** `200 OK` with applications array

#### Update Application Status
- **Endpoint:** `PATCH /api/applicants/update/:id`
- **Description:** Update application status
- **Request Body (JSON):**
  - `status` (string, required) - 'New', 'Reviewed', 'Shortlisted', 'Rejected', 'Interviewed'
- **Response:** `200 OK` with updated application

### Ebook Management Endpoints

#### Create Ebook
- **Endpoint:** `POST /api/ebooks/save`
- **Description:** Create new ebook with image and PDF
- **Request Body (form-data):**
  - `title` (string, required)
  - `description` (string, required)
  - `image` (file, required)
  - `pdf` (file, required)
- **Response:** `201 Created` with ebook object

#### Update Ebook
- **Endpoint:** `PUT /api/ebooks/update/:id`
- **Description:** Update existing ebook
- **Request Body (form-data):**
  - `title` (string, optional)
  - `description` (string, optional)
  - `image` (file, optional)
  - `pdf` (file, optional)
- **Response:** `200 OK` with updated ebook object

### Metrics Endpoints

#### Get Featured Blogs
- **Endpoint:** `GET /api/metrics/featured`
- **Description:** Get featured blogs for dashboard
- **Response:** `200 OK` with featured blogs array

---

## Email Setup

### Overview
The system uses nodemailer for email functionality, supporting Gmail, Outlook, and custom SMTP servers for OTP-based password reset.

### Environment Variables
```env
# Basic Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Advanced Configuration (for custom SMTP)
EMAIL_HOST=smtp.your-domain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM=noreply@your-domain.com
```

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Navigate to Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to Google Account settings
   - Navigate to Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and your device
   - Generate the 16-character password

3. **Update Environment Variables**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   ```

### Custom SMTP Configuration

#### Office 365 / Microsoft Exchange
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@your-domain.com
EMAIL_PASSWORD=your-password
```

#### Outlook.com / Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### Custom Domain (cPanel)
```env
EMAIL_HOST=mail.your-domain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@your-domain.com
EMAIL_PASSWORD=your-password
```

### Email Service Providers

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-mailgun-username
EMAIL_PASSWORD=your-mailgun-password
```

### Testing Email Configuration

Add this test endpoint to verify email setup:
```javascript
app.post('/test-email', async (req, res) => {
  try {
    const emailSent = await sendOTPEmail('test@example.com', '123456', 'Test User');
    if (emailSent) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Email test failed', error: error.message });
  }
});
```

---

## Password Reset System

### Overview
The system implements an OTP-based password reset with four main APIs:
1. **Forgot Password** - Generates and sends 6-digit OTP
2. **Verify OTP** - Validates OTP before password reset
3. **Reset Password** - Sets new password using valid OTP
4. **Resend OTP** - Requests new OTP if previous expires

### API Endpoints

#### 1. Forgot Password (Send OTP)
- **Endpoint:** `POST /forgot-password`
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to your email",
    "company": "DexPro"
  }
  ```

#### 2. Verify OTP
- **Endpoint:** `POST /verify-otp`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "company": "DexPro"
  }
  ```

#### 3. Reset Password
- **Endpoint:** `POST /reset-password`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "otp": "123456",
    "newPassword": "newSecurePassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password reset successfully",
    "company": "DexPro"
  }
  ```

#### 4. Resend OTP
- **Endpoint:** `POST /resend-otp`
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "New OTP sent successfully",
    "company": "DexPro"
  }
  ```

### Security Features
- **OTP Generation**: Cryptographically secure 6-digit codes
- **Expiration**: OTPs expire after 10 minutes
- **Password Requirements**: Minimum 6 characters, bcrypt hashing
- **Email Security**: TLS/SSL encryption, professional templates

### Email Template Features
- Professional HTML design with DexPro branding
- Large, easy-to-read 6-digit OTP display
- 10-minute expiration notice
- Security warnings and company signature
- Responsive design for all devices

---

## Media Upload Integration

### Overview
All file uploads are integrated with the DexPro media service at `https://media.dexprosolutions.com/media/upload`. Files are uploaded to this service and URLs are stored in the database instead of local file paths.

### Centralized Utility Functions

The `utils/mediaUpload.js` file provides:
- `formatMediaUrl(url)`: Formats media URLs for consistent display
- `uploadToMediaService(filePath, originalName)`: Uploads files to media service
- `uploadSingleFile(file, fieldName)`: Uploads single file with error handling
- `uploadMultipleFiles(files, fieldName)`: Uploads multiple files with error handling

### File Upload Process
1. **Local Storage**: Files temporarily stored using multer
2. **Media Service Upload**: Files uploaded to DexPro media service
3. **URL Storage**: Returned URL stored in database
4. **Cleanup**: Local temporary files automatically cleaned up
5. **Response Formatting**: URLs formatted for consistent display

### Supported File Types
- **Images**: Profile pictures, blog featured images, ebook covers
- **PDFs**: Resumes, ebooks, documents
- **Other**: Any file type supported by the media service

### Integration Points
- **User Management**: Profile picture uploads
- **Blog Management**: Featured image uploads
- **Job Applications**: Resume PDF uploads
- **Ebook Management**: Cover images and PDF files
- **Metrics**: Featured blog image display

### Usage Example
```javascript
const { uploadSingleFile, formatMediaUrl } = require('../utils/mediaUpload');

// Upload a file
const fileUrl = await uploadSingleFile(req.file, 'profile_pic');

// Format URL for response
const formattedUrl = formatMediaUrl(fileUrl);
```

### Benefits
- **Centralized Storage**: All files in one location
- **Scalability**: No local storage limitations
- **CDN Benefits**: Files served through CDN for performance
- **Consistency**: Uniform upload pattern across all features
- **Maintainability**: Centralized utility functions

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  role INTEGER DEFAULT 1,
  gender TEXT,
  profile_pic TEXT,
  reset_otp TEXT,
  reset_otp_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Blogs Table
```sql
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_desc TEXT,
  content TEXT,
  featured_image TEXT,
  category TEXT,
  author_id UUID,
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_time TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Jobs Table
```sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'freelance')),
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL,
  requirements TEXT[] NOT NULL,
  compensation TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Applicants Table
```sql
CREATE TABLE applicants (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  resume_pdf TEXT NOT NULL,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'new' 
    CHECK (status IN ('new', 'reviewed', 'shortlisted', 'rejected', 'Interviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, email),
  UNIQUE(job_id, phone)
);
```

### Ebooks Table
```sql
CREATE TABLE ebooks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  image TEXT,
  pdf_file TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Additional Tables

#### Leads Table
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, email),
  UNIQUE (book_id, phone)
);
```

#### Services Table
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  sub_services TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Project Requirements Table
```sql
CREATE TABLE project_requirements (
  id SERIAL PRIMARY KEY,
  username TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  selectedServices TEXT[] NOT NULL DEFAULT '{}',
  selectedSubServices JSONB NOT NULL DEFAULT '{}'::jsonb,
  projectTimeline TEXT,
  additionalRequirements TEXT,
  keepUpdated BOOLEAN,
  budgetRange NUMERIC,
  submittedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Newsletter Subscribers Table
```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Deployment

### Production Environment Setup

1. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=3000
   DB_HOST=your-production-db-host
   DB_PORT=5432
   DB_NAME=dexpro_admin_prod
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   EMAIL_USER=admin@dexprosolutions.com
   EMAIL_PASSWORD=your-production-app-password
   MEDIA_SERVICE_URL=https://media.dexprosolutions.com
   ```

2. **Database Setup**
   ```bash
   # Create production database
   createdb dexpro_admin_prod
   
   # Run schema creation
   NODE_ENV=production node createTables.js
   ```

3. **Process Management**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start app.js --name "dexpro-admin-backend"
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

### Docker Deployment

1. **Build Production Image**
   ```bash
   docker build -t dexpro-admin-backend:production .
   ```

2. **Run with Environment Variables**
   ```bash
   docker run -d \
     --name dexpro-admin-backend \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e DB_HOST=your-db-host \
     -e DB_PASSWORD=your-db-password \
     -e EMAIL_USER=your-email \
     -e EMAIL_PASSWORD=your-password \
     dexpro-admin-backend:production
   ```

### Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use strong, unique passwords
   - Rotate credentials regularly

2. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const otpLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 3, // limit each IP to 3 OTP requests per windowMs
     message: 'Too many OTP requests, please try again later'
   });
   ```

3. **HTTPS Configuration**
   - Use HTTPS in production
   - Configure SSL certificates
   - Set secure headers

4. **Database Security**
   - Use connection pooling
   - Implement proper access controls
   - Regular backups

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
**Error**: `ECONNREFUSED` or `ENOTFOUND`
**Solutions**:
- Verify database is running
- Check connection credentials
- Ensure database exists
- Verify network connectivity

#### 2. Email Configuration Issues
**Error**: `535 Authentication failed`
**Solutions**:
- Verify email credentials
- Check if 2FA is enabled (use app password)
- Ensure SMTP settings are correct
- Test with email provider's settings

#### 3. File Upload Issues
**Error**: `ENOENT` or upload failures
**Solutions**:
- Check media service connectivity
- Verify file permissions
- Ensure upload directory exists
- Check file size limits

#### 4. OTP Issues
**Error**: OTP not received or invalid
**Solutions**:
- Check email configuration
- Verify email delivery
- Check spam folder
- Ensure OTP hasn't expired

### Debug Mode

Enable debug logging:
```javascript
// Email debug
const transporter = nodemailer.createTransporter({
  // ... configuration
  debug: true,
  logger: true
});

// Database debug
const pool = new Pool({
  // ... configuration
  log: console.log
});
```

### Logging

Implement comprehensive logging:
```javascript
const logActivity = (action, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: action,
    details: details,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  console.log('Activity Log:', JSON.stringify(logEntry, null, 2));
};
```

### Performance Monitoring

1. **Database Performance**
   - Monitor query execution times
   - Use connection pooling
   - Implement query optimization

2. **File Upload Performance**
   - Monitor upload speeds
   - Implement file size limits
   - Use streaming for large files

3. **Email Performance**
   - Monitor delivery rates
   - Implement email queuing
   - Track bounce rates

### Support

For additional support:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test individual components in isolation
4. Review this documentation for specific solutions
5. Contact the development team with specific error details

---

## License

This project is licensed under the MIT License.

---

*Last updated: January 2025*
*Version: 1.0.0* 