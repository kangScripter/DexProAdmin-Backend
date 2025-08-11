const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const path = require('path');

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

/**
 * @route POST /api/blogs
 * @desc Create a new blog post
 */
router.post('/', upload.single('featured_image'), async (req, res) => {
  try {
    const {
      title,
      slug,
      short_desc,
      content,
      status,
      scheduled_time,
      published_at,
      category,
      author_id,
      tags,
      seo_title,
      seo_description,
      seo_keywords,
      canonical_url,
      views_count,
      likes_count,
      is_featured,
      is_pinned,
      is_deleted,
      visibility,
    } = req.body;

    const featuredImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const seoKeywordsArray = seo_keywords ? seo_keywords.split(',').map(k => k.trim()) : [];

    const result = await pool.query(
      `INSERT INTO blogs (
        title, slug, short_desc, content
        
        , featured_image, category, author_id,
        seo_title, seo_description, seo_keywords, canonical_url, tags,
        status, scheduled_time, published_at,
        created_at, updated_at,
        views_count, likes_count,
        is_featured, is_pinned, is_deleted, visibility
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15,
        NOW(), NOW(),
        $16, $17,
        $18, $19, $20, $21
      ) RETURNING *`,
      [
        title,
        slug,
        short_desc,
        content,
        featuredImagePath,
        category,
        author_id,
        seo_title,
        seo_description,
        seoKeywordsArray,
        canonical_url,
        tagsArray,
        status,
        scheduled_time || null,
        published_at || null,
        views_count || 0,
        likes_count || 0,
        is_featured === 'true' || false,
        is_pinned === 'true' || false,
        is_deleted === 'true' || false,
        visibility || 'public',
      ]
    );

    res.status(201).json({ success: true, blog: result.rows[0] });
  } catch (err) {
    console.error('Error inserting blog:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reorder routes to prevent endpoint clashes

// Specific route to get blog by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE slug = $1', [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const blog = result.rows[0];

    // Find the next and previous blog by published_at or created_at
    let nextBlog = null;
    let prevBlog = null;
    const dateField = blog.published_at || blog.created_at;
    if (dateField) {
      // Next blog
      const nextResult = await pool.query(
        `SELECT * FROM blogs 
         WHERE slug != $2 AND (COALESCE(published_at, created_at) > $1)
         ORDER BY COALESCE(published_at, created_at) ASC LIMIT 1`,
        [dateField, blog.slug]
      );
      if (nextResult.rows.length > 0) {
        nextBlog = nextResult.rows[0];
        if (nextBlog.featured_image) {
          const serverUrl = `${req.protocol}://${req.get('host')}`;
          nextBlog.featured_image = `${serverUrl}${nextBlog.featured_image}`;
        }
      }
      // Previous blog
      const prevResult = await pool.query(
        `SELECT * FROM blogs 
         WHERE slug != $2 AND (COALESCE(published_at, created_at) < $1)
         ORDER BY COALESCE(published_at, created_at) DESC LIMIT 1`,
        [dateField, blog.slug]
      );
      if (prevResult.rows.length > 0) {
        prevBlog = prevResult.rows[0];
        if (prevBlog.featured_image) {
          const serverUrl = `${req.protocol}://${req.get('host')}`;
          prevBlog.featured_image = `${serverUrl}${prevBlog.featured_image}`;
        }
      }
    }

    // Append full URL to featured_image
    if (blog.featured_image) {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      blog.featured_image = `${serverUrl}${blog.featured_image}`;
    }

    res.json({ blog, prevBlog, nextBlog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Specific route to get all blogs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    // Add full URL to featured_image for each blog
    const blogs = result.rows.map(blog => {
      if (blog.author_id) {
        blog.author = {
          id: blog.author_id,
          name: () => {}, // Replace with actual author name if available
        };
      }
      if (blog.featured_image) {
        blog.featured_image = `${serverUrl}${blog.featured_image}`;
      }
      return blog;
    });
    res.json({ blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a blog by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM blogs WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json({ message: 'Blog deleted successfully', blog: result.rows[0] });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete by slug
router.delete('/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query('DELETE FROM blogs WHERE slug = $1 RETURNING *', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json({ message: 'Blog deleted successfully', blog: result.rows[0] });
  } catch (error) {
    console.error('Error deleting blog by slug:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all blogs
router.delete('/', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM blogs RETURNING *');
    res.json({ message: 'All blogs deleted successfully', count: result.rowCount });
  } catch (error) {
    console.error('Error deleting all blogs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
