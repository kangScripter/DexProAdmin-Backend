// routes/ebooks.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // <-- pool, not db
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validate: isUuid } = require('uuid');

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ---------- helpers ----------
function parseHighlights(highlights) {
  if (Array.isArray(highlights)) return highlights;
  if (typeof highlights === 'string') {
    return highlights.split(',').map(h => h.trim()).filter(Boolean);
  }
  return [];
}

// ---------- CREATE (Upload Book)
router.post('/save', upload.fields([{ name: 'image' }, { name: 'pdf_file' }]), async (req, res) => {
  try {
    const { title, description, highlights } = req.body;

    if (!req.files || !req.files['image'] || !req.files['pdf_file']) {
      return res.status(400).json({ error: 'Both image and pdf_file are required.' });
    }

    const image = req.files['image'][0].filename;
    const pdf_file = req.files['pdf_file'][0].filename;
    const parsedHighlights = parseHighlights(highlights);

    const { rows } = await pool.query(
      `INSERT INTO ebooks (title, description, highlights, image, pdf_file)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, parsedHighlights, image, pdf_file]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error while saving book:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- READ (All Books)
router.get('/get', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ebooks ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE (By ID)
router.put('/update/:id', upload.fields([{ name: 'image' }, { name: 'pdf_file' }]), async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ message: 'Invalid book id' });

  try {
    const { rows: existingRows } = await pool.query('SELECT * FROM ebooks WHERE id = $1', [id]);
    if (existingRows.length === 0) return res.status(404).json({ message: 'Book not found' });
    const book = existingRows[0];

    const { title, description, highlights } = req.body;

    let image = book.image;
    let pdf_file = book.pdf_file;
    let parsedHighlights = book.highlights;

    if (highlights !== undefined) parsedHighlights = parseHighlights(highlights);

    if (req.files && req.files['image'] && req.files['image'][0]) {
      const newImage = req.files['image'][0].filename;
      if (image) {
        const oldImagePath = path.join(uploadPath, image);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      image = newImage;
    }

    if (req.files && req.files['pdf_file'] && req.files['pdf_file'][0]) {
      const newPdf = req.files['pdf_file'][0].filename;
      if (pdf_file) {
        const oldPdfPath = path.join(uploadPath, pdf_file);
        if (fs.existsSync(oldPdfPath)) fs.unlinkSync(oldPdfPath);
      }
      pdf_file = newPdf;
    }

    const { rows: updatedRows } = await pool.query(
      `UPDATE ebooks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           highlights = $3,
           image = $4,
           pdf_file = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        typeof title === 'string' ? title : null,
        typeof description === 'string' ? description : null,
        parsedHighlights,
        image,
        pdf_file,
        id
      ]
    );

    res.status(200).json({ message: 'Book updated successfully', book: updatedRows[0] });
  } catch (err) {
    console.error('Error while updating book:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE (By ID)
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ message: 'Invalid book id' });

  const client = await pool.connect(); // <-- use pool.connect()
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM ebooks WHERE id = $1', [id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Book not found' });
    }
    const book = rows[0];

    const imagePath = path.join(uploadPath, book.image || '');
    const pdfPath = path.join(uploadPath, book.pdf_file || '');

    await client.query('DELETE FROM ebooks WHERE id = $1', [id]);
    await client.query('COMMIT');

    if (book.image && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (book.pdf_file && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    res.json({ message: 'Deleted successfully including files' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting book and files:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- Download Request (create Lead)
router.post('/download/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, phone } = req.body;

  if (!isUuid(id)) return res.status(400).json({ message: 'Invalid book id' });
  if (!username || !phone) {
    return res.status(400).json({ message: 'username and phone are required' });
  }

  try {
    const { rows: books } = await pool.query('SELECT * FROM ebooks WHERE id = $1', [id]);
    if (books.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    const book = books[0];

    try {
      await pool.query(
        `INSERT INTO leads (book_id, username, email, phone)
         VALUES ($1, $2, $3, $4)`,
        [id, username, email || null, phone]
      );

      return res.status(201).json({
        message: 'Lead saved successfully',
        pdfUrl: book.pdf_file
      });
    } catch (e) {
      if (e.code === '23505') {
        // unique_violation
        return res.status(409).json({
          message: 'A lead with this email/phone already exists for this book.'
        });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

// ---------- READ (All Lead Data)
router.get('/lead/get', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, 
              json_build_object(
                'id', e.id,
                'title', e.title,
                'description', e.description,
                'image', e.image,
                'pdf_file', e.pdf_file
              ) AS book
       FROM leads l
       JOIN ebooks e ON e.id = l.book_id
       ORDER BY l.created_at DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching leads', error });
  }
});

// DELETE a lead by leadId
router.delete('/lead/delete/:leadId', async (req, res) => {
  const { leadId } = req.params;
  if (!isUuid(leadId)) return res.status(400).json({ message: 'Invalid leadId' });

  try {
    const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [leadId]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    return res.status(200).json({ deleted: rowCount });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});


module.exports = router;