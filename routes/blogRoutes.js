const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const path = require('path');

// Configure multer
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

// @route POST /api/blogs
router.post('/', upload.single('featured_image'), async (req, res) => {
  try {
    const {
      title,
      short_desc,
      content,
      status,
      scheduled_time,
      category,
      tags,
      seo_title,
      seo_description,
      seo_keyword,
    } = req.body;

    const featuredImagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const result = await pool.query(
      `INSERT INTO blogs
        (title, short_desc, content, featured_image, status, scheduled_time,
         category, tags, seo_title, seo_description, seo_keyword)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title,
        short_desc,
        content,
        featuredImagePath,
        status,
        scheduled_time || null,
        category,
        tagsArray,
        seo_title,
        seo_description,
        seo_keyword,
      ]
    );

    res.status(201).json({ success: true, blog: result.rows[0] });
  } catch (err) {
    console.error('Error inserting blog:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const blog = result.rows[0];

    // Append full domain URL to featured_image if it exists
    if (blog.featured_image) {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      blog.featured_image = `${serverUrl}${blog.featured_image}`;
    }

    res.json({ blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
