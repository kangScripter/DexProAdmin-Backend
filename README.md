# DexPro Admin Backend

This is the backend for DexPro Admin, built with Node.js, Express, and PostgreSQL.

## Features
- Blog creation with image upload
- Fetch blog by ID
- Multer for file uploads
- PostgreSQL database

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your environment variables.
3. Start the server:
   ```
   npm start
   ```

## API Endpoints
- `POST /api/blogs` — Create a new blog post (supports file upload for `featured_image`)
- `GET /api/blogs/:id` — Get a blog post by ID

## Project Structure
- `routes/` — Express route handlers
- `db.js` — Database connection
- `uploads/` — Uploaded images (gitignored)

## License
MIT
