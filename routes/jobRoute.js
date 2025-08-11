const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL pool
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const upload = multer();

// Create job
router.post('/save', upload.none(), async (req, res) => {
  try {
    const {
      title,
      location,
      type,
      description,
      skills = [],
      requirements = [],
      compensation,
      status = 'open'
    } = req.body;

    const jobId = uuidv4();

    const result = await pool.query(
      `INSERT INTO jobs 
      (id, title, location, type, description, skills, requirements, compensation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        jobId,
        title,
        location,
        type,
        description,
        skills,
        requirements,
        compensation || null,
        status
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all jobs
router.get('/get-all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM jobs ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get job by ID
router.get('/get/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update job (PUT = full update)
router.put('/update/:id', async (req, res) => {
  try {
    const {
      title,
      location,
      type,
      description,
      skills = [],
      requirements = [],
      compensation,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE jobs
       SET title = $1,
           location = $2,
           type = $3,
           description = $4,
           skills = $5,
           requirements = $6,
           compensation = $7,
           status = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        title,
        location,
        type,
        description,
        skills,
        requirements,
        compensation || null,
        status,
        req.params.id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Job not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
});

// PATCH job status
router.patch('/update/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Job not found' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job status', error: error.message });
  }
});

// Delete job
router.delete('/delete/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM jobs WHERE id = $1 RETURNING *`, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Job not found' });

    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;

