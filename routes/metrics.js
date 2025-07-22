const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get("/metrics", async (req, res) => {
  try {
    const client = await pool.connect();

    const [blogsRes, leadsRes, newsletterRes, viewsRes] = await Promise.all([
      client.query("SELECT COUNT(*) FROM blogs"),
      client.query("SELECT COUNT(*) FROM leads"),
      client.query("SELECT COUNT(*) FROM newsletter_subscribers"),
      client.query("SELECT COALESCE(SUM(views), 0) FROM blogs")
    ]);

    client.release();

    res.json({
      total_blogs: parseInt(blogsRes.rows[0].count),
      total_leads: parseInt(leadsRes.rows[0].count),
      total_newsletter_subscribers: parseInt(newsletterRes.rows[0].count),
      total_views: parseInt(viewsRes.rows[0].coalesce),
    });
  } catch (err) {
    console.error("Error fetching metrics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const result = await pool.query(
      `SELECT * FROM blogs 
       WHERE is_featured = true AND (is_deleted IS NULL OR is_deleted = false)
       ORDER BY published_at DESC
       LIMIT 10;`
    );

    const blogs = result.rows.map((blog) => ({
      ...blog,
      featured_image: blog.featured_image
        ? `${serverUrl}${blog.featured_image}`
        : null,
    }));

    res.json({
      success: true,
      blogs,
    });
  } catch (err) {
    console.error('Error fetching featured blogs:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;