const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const path = require('path');
const { formatMediaUrl, uploadSingleFile } = require('../utils/mediaUpload');

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

    let featuredImageUrl = null;
    if (req.file) {
      try {
        featuredImageUrl = await uploadSingleFile(req.file, 'featured_image');
      } catch (uploadErr) {
        console.error('Error uploading featured image:', uploadErr);
        return res.status(500).json({ success: false, error: 'Failed to upload featured image', company: 'DexPro' });
      }
    }

    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const seoKeywordsArray = seo_keywords ? seo_keywords.split(',').map(k => k.trim()) : [];

    const result = await pool.query(
      `INSERT INTO blogs (
        title, slug, short_desc, content,
        featured_image, category, author_id,
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
        featuredImageUrl,
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

    if (result.rows.length > 0) {
      let blog = result.rows[0];
      blog.featured_image = formatMediaUrl(blog.featured_image);
      res.status(201).json({ success: true, blog });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create blog' });
    }
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
    if (blog.featured_image && !blog.featured_image.startsWith('http')) {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      blog.featured_image = `${serverUrl}${blog.featured_image}`;
    }
    if (blog.featured_image && blog.featured_image.startsWith('http://')) {
      blog.featured_image = blog.featured_image.replace('http://', 'https://');
    }
    if (blog.featured_image) {
      blog.featured_image = formatMediaUrl(blog.featured_image);
    }
    if (prevBlog && prevBlog.featured_image) {
      prevBlog.featured_image = formatMediaUrl(prevBlog.featured_image);
    }
    if (nextBlog && nextBlog.featured_image) {
      nextBlog.featured_image = formatMediaUrl(nextBlog.featured_image);
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
      if (blog.featured_image) {
        blog.featured_image = formatMediaUrl(blog.featured_image);
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
    let blog = result.rows[0];
    blog.featured_image = formatMediaUrl(blog.featured_image);
    res.json({ message: 'Blog deleted successfully', blog });
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
    let blog = result.rows[0];
    blog.featured_image = formatMediaUrl(blog.featured_image);
    res.json({ message: 'Blog deleted successfully', blog });
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

// Update a blog by slug
router.put('/:slug', upload.single('featured_image'), async (req, res) => {
  const { slug } = req.params;
  const {
    title,
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
    visibility
  } = req.body;

  let featuredImageUrl = null;
  if (req.file) {
    try {
      featuredImageUrl = await uploadSingleFile(req.file, 'featured_image');
    } catch (uploadErr) {
      console.error('Error uploading featured image:', uploadErr);
      return res.status(500).json({ success: false, error: 'Failed to upload featured image', company: 'DexPro' });
    }
  }

  try {
    let updateFields = [];
    let values = [];
    let idx = 1;

    if (title) { updateFields.push(`title = $${idx++}`); values.push(title); }
    if (short_desc) { updateFields.push(`short_desc = $${idx++}`); values.push(short_desc); }
    if (content) { updateFields.push(`content = $${idx++}`); values.push(content); }
    if (status) { updateFields.push(`status = $${idx++}`); values.push(status); }
    if (scheduled_time) { updateFields.push(`scheduled_time = $${idx++}`); values.push(scheduled_time); }
    if (published_at) { updateFields.push(`published_at = $${idx++}`); values.push(published_at); }
    if (category) { updateFields.push(`category = $${idx++}`); values.push(category); }
    if (author_id) { updateFields.push(`author_id = $${idx++}`); values.push(author_id); }
    if (tags) { updateFields.push(`tags = $${idx++}`); values.push(tags.split(',').map(tag => tag.trim())); }
    if (seo_title) { updateFields.push(`seo_title = $${idx++}`); values.push(seo_title); }
    if (seo_description) { updateFields.push(`seo_description = $${idx++}`); values.push(seo_description); }
    if (seo_keywords) { updateFields.push(`seo_keywords = $${idx++}`); values.push(seo_keywords.split(',').map(k => k.trim())); }
    if (canonical_url) { updateFields.push(`canonical_url = $${idx++}`); values.push(canonical_url); }
    if (views_count) { updateFields.push(`views_count = $${idx++}`); values.push(views_count); }
    if (likes_count) { updateFields.push(`likes_count = $${idx++}`); values.push(likes_count); }
    if (is_featured !== undefined) { updateFields.push(`is_featured = $${idx++}`); values.push(is_featured === 'true' || is_featured === true); }
    if (is_pinned !== undefined) { updateFields.push(`is_pinned = $${idx++}`); values.push(is_pinned === 'true' || is_pinned === true); }
    if (is_deleted !== undefined) { updateFields.push(`is_deleted = $${idx++}`); values.push(is_deleted === 'true' || is_deleted === true); }
    if (visibility) { updateFields.push(`visibility = $${idx++}`); values.push(visibility); }
    if (featuredImageUrl) { updateFields.push(`featured_image = $${idx++}`); values.push(featuredImageUrl); }
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(slug);
    const query = `UPDATE blogs SET ${updateFields.join(', ')} WHERE slug = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    let blog = result.rows[0];
    blog.featured_image = formatMediaUrl(blog.featured_image);
    res.status(200).json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Failed to update blog' });
  }
});

// Toggle featured status for a blog
router.patch('/:slug/toggle-featured', async (req, res) => {
  const { slug } = req.params;
  
  try {
    // First, get the current blog to check its featured status
    const getResult = await pool.query('SELECT id, is_featured FROM blogs WHERE slug = $1', [slug]);
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found',
        company: 'DexPro'
      });
    }

    const blog = getResult.rows[0];
    const newFeaturedStatus = !blog.is_featured; // Toggle the current status

    // Update the featured status
    const updateResult = await pool.query(
      'UPDATE blogs SET is_featured = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [newFeaturedStatus, slug]
    );

    if (updateResult.rows.length > 0) {
      let updatedBlog = updateResult.rows[0];
      updatedBlog.featured_image = formatMediaUrl(updatedBlog.featured_image);
      
      res.status(200).json({
        success: true,
        message: `Blog ${newFeaturedStatus ? 'marked as featured' : 'removed from featured'}`,
        company: 'DexPro',
        data: {
          blog: updatedBlog,
          is_featured: newFeaturedStatus,
          action: newFeaturedStatus ? 'featured' : 'unfeatured'
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update blog featured status',
        company: 'DexPro'
      });
    }
  } catch (error) {
    console.error('Error toggling blog featured status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while toggling featured status',
      company: 'DexPro'
    });
  }
});

// Toggle pinned status for a blog
router.patch('/:slug/toggle-pinned', async (req, res) => {
  const { slug } = req.params;
  
  try {
    // First, get the current blog to check its pinned status
    const getResult = await pool.query('SELECT id, is_pinned FROM blogs WHERE slug = $1', [slug]);
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found',
        company: 'DexPro'
      });
    }

    const blog = getResult.rows[0];
    const newPinnedStatus = !blog.is_pinned; // Toggle the current status

    // Update the pinned status
    const updateResult = await pool.query(
      'UPDATE blogs SET is_pinned = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [newPinnedStatus, slug]
    );

    if (updateResult.rows.length > 0) {
      let updatedBlog = updateResult.rows[0];
      updatedBlog.featured_image = formatMediaUrl(updatedBlog.featured_image);
      
      res.status(200).json({
        success: true,
        message: `Blog ${newPinnedStatus ? 'pinned' : 'unpinned'}`,
        company: 'DexPro',
        data: {
          blog: updatedBlog,
          is_pinned: newPinnedStatus,
          action: newPinnedStatus ? 'pinned' : 'unpinned'
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update blog pinned status',
        company: 'DexPro'
      });
    }
  } catch (error) {
    console.error('Error toggling blog pinned status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while toggling pinned status',
      company: 'DexPro'
    });
  }
});

// Toggle deleted status for a blog (soft delete/restore)
router.patch('/:slug/toggle-deleted', async (req, res) => {
  const { slug } = req.params;
  
  try {
    // First, get the current blog to check its deleted status
    const getResult = await pool.query('SELECT id, is_deleted FROM blogs WHERE slug = $1', [slug]);
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found',
        company: 'DexPro'
      });
    }

    const blog = getResult.rows[0];
    const newDeletedStatus = !blog.is_deleted; // Toggle the current status

    // Update the deleted status
    const updateResult = await pool.query(
      'UPDATE blogs SET is_deleted = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [newDeletedStatus, slug]
    );

    if (updateResult.rows.length > 0) {
      let updatedBlog = updateResult.rows[0];
      updatedBlog.featured_image = formatMediaUrl(updatedBlog.featured_image);
      
      res.status(200).json({
        success: true,
        message: `Blog ${newDeletedStatus ? 'soft deleted' : 'restored'}`,
        company: 'DexPro',
        data: {
          blog: updatedBlog,
          is_deleted: newDeletedStatus,
          action: newDeletedStatus ? 'deleted' : 'restored'
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update blog deleted status',
        company: 'DexPro'
      });
    }
  } catch (error) {
    console.error('Error toggling blog deleted status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while toggling deleted status',
      company: 'DexPro'
    });
  }
});

module.exports = router;
