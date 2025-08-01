const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const existingSubscriber = await pool.query(
      'SELECT * FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existingSubscriber.rows.length > 0) {
      return res.status(409).json({ error: 'Email already subscribed' });
    }

    const result = await pool.query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) RETURNING *',
      [email]
    );

    res.status(201).json({
      success: true,
      subscriber: result.rows[0],
    });
  } catch (err) {
    console.error('Error subscribing to newsletter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/subscribers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No subscribers found' });
    }

    res.json({
      success: true,
      subscribers: result.rows,
    });
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/unsubscribe/:email', async (req, res) => {
  const { email } = req.params;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
    const result = await pool.query(
      'DELETE FROM newsletter_subscribers WHERE email = $1 RETURNING *',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.json({
      success: true,
      message: 'Unsubscribed successfully',
      subscriber: result.rows[0],
    });
    } catch (err) {
    console.error('Error unsubscribing:', err);
    res.status(500).json({ error: 'Internal server error' });
    }
});
module.exports = router;