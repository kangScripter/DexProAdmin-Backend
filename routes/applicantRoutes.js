const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db'); // PostgreSQL pool

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// CREATE (Upload applicant)
router.post('/save/:jobId', upload.single('resumePDF'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { name, email, phone, coverLetter, status } = req.body;
    const resumePDF = req.file?.filename;

    if (!resumePDF) {
      return res.status(400).json({ error: 'Resume is required.' });
    }

    const result = await pool.query(`
      INSERT INTO applicants (id, job_id, name, email, phone, resume_pdf, cover_letter, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [jobId, name, email, phone, resumePDF, coverLetter || null, status || 'new']);

    res.status(201).json({ message: 'Application submitted successfully!', data: result.rows[0] });
  } catch (err) {
    console.error('Error while saving applicant:', err);
    res.status(500).json({ error: err.message });
  }
});


// GET all applicants with job title
router.get('/get', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*, 
        j.title AS job 
      FROM applicants a
      JOIN jobs j ON a.job_id = j.id
      ORDER BY a.created_at DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const allowedStatuses = ['New', 'Reviewed', 'Shortlisted', 'Rejected', 'Interviewed'];

router.patch('/update/:id', async (req, res) => {
  try {
    let { status } = req.body;

    // Capitalize the first letter of status
    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status: ${status}` });
    }

    const result = await pool.query(`
      UPDATE applicants 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *;
    `, [status, req.params.id]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating applicant status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});



// Download resume PDF
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});


// DELETE applicant and associated resume file
router.delete('/delete/:id', async (req, res) => {
  try {
    // Get applicant first to access filename
    const getResult = await pool.query(`SELECT resume_pdf FROM applicants WHERE id = $1`, [req.params.id]);
    const applicant = getResult.rows[0];

    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    const resumePath = path.join(__dirname, '../uploads', applicant.resume_pdf);
    if (fs.existsSync(resumePath)) {
      fs.unlinkSync(resumePath);
    }

    await pool.query(`DELETE FROM applicants WHERE id = $1`, [req.params.id]);

    res.status(200).json({ message: 'Applicant and file deleted successfully' });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    res.status(500).json({ error: 'Failed to delete applicant' });
  }
});

module.exports = router;

