// routes/ebooks.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // <-- pool, not db
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { formatMediaUrl, uploadSingleFile } = require('../utils/mediaUpload');

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

    let imageUrl = null;
    let pdfUrl = null;

    // Upload image to media service
    try {
      imageUrl = await uploadSingleFile(req.files['image'][0], 'image');
    } catch (uploadErr) {
      console.error('Error uploading image:', uploadErr);
      return res.status(500).json({ success: false, error: 'Failed to upload image', company: 'DexPro' });
    }

    // Upload PDF to media service
    try {
      pdfUrl = await uploadSingleFile(req.files['pdf_file'][0], 'pdf_file');
    } catch (uploadErr) {
      console.error('Error uploading PDF:', uploadErr);
      return res.status(500).json({ success: false, error: 'Failed to upload PDF', company: 'DexPro' });
    }

    const parsedHighlights = parseHighlights(highlights);

    const { rows } = await pool.query(
      `INSERT INTO ebooks (title, description, highlights, image, pdf_file)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, parsedHighlights, imageUrl, pdfUrl]
    );

    // Format media URLs in response
    let book = rows[0];
    book.image = formatMediaUrl(book.image);
    book.pdf_file = formatMediaUrl(book.pdf_file);

    res.status(201).json(book);
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
    
    // Format media URLs for all books
    const books = rows.map(book => {
      if (book.image) {
        book.image = formatMediaUrl(book.image);
      }
      if (book.pdf_file) {
        book.pdf_file = formatMediaUrl(book.pdf_file);
      }
      return book;
    });
    
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE (By ID)
router.put('/update/:id', upload.fields([{ name: 'image' }, { name: 'pdf_file' }]), async (req, res) => {
  const { id } = req.params;
  const bookId = parseInt(id);
  if (isNaN(bookId) || bookId <= 0) return res.status(400).json({ message: 'Invalid book id' });

  try {
    const { rows: existingRows } = await pool.query('SELECT * FROM ebooks WHERE id = $1', [bookId]);
    if (existingRows.length === 0) return res.status(404).json({ message: 'Book not found' });
    const book = existingRows[0];

    const { title, description, highlights } = req.body;

    let image = book.image;
    let pdf_file = book.pdf_file;
    let parsedHighlights = book.highlights;

    if (highlights !== undefined) parsedHighlights = parseHighlights(highlights);

    // Handle image upload
    if (req.files && req.files['image'] && req.files['image'][0]) {
      try {
        image = await uploadSingleFile(req.files['image'][0], 'image');
      } catch (uploadErr) {
        console.error('Error uploading image:', uploadErr);
        return res.status(500).json({ success: false, error: 'Failed to upload image', company: 'DexPro' });
      }
    }

    // Handle PDF upload
    if (req.files && req.files['pdf_file'] && req.files['pdf_file'][0]) {
      try {
        pdf_file = await uploadSingleFile(req.files['pdf_file'][0], 'pdf_file');
      } catch (uploadErr) {
        console.error('Error uploading PDF:', uploadErr);
        return res.status(500).json({ success: false, error: 'Failed to upload PDF', company: 'DexPro' });
      }
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
        bookId
      ]
    );

    // Format media URLs in response
    let updatedBook = updatedRows[0];
    updatedBook.image = formatMediaUrl(updatedBook.image);
    updatedBook.pdf_file = formatMediaUrl(updatedBook.pdf_file);

    res.status(200).json({ message: 'Book updated successfully', book: updatedBook });
  } catch (err) {
    console.error('Error while updating book:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE (By ID)
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const bookId = parseInt(id);
  if (isNaN(bookId) || bookId <= 0) return res.status(400).json({ message: 'Invalid book id' });

  const client = await pool.connect(); // <-- use pool.connect()
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM ebooks WHERE id = $1', [bookId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Book not found' });
    }
    const book = rows[0];

    await client.query('DELETE FROM ebooks WHERE id = $1', [bookId]);
    await client.query('COMMIT');

    // Note: Since we're now storing URLs instead of local filenames,
    // we don't need to delete local files anymore
    // The media service handles file management

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting book:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- Download Request (create Lead)
router.post('/download/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, phone } = req.body;

  const bookId = parseInt(id);
  if (isNaN(bookId) || bookId <= 0) return res.status(400).json({ message: 'Invalid book id' });
  if (!username || !phone) {
    return res.status(400).json({ message: 'username and phone are required' });
  }

  try {
    const { rows: books } = await pool.query('SELECT * FROM ebooks WHERE id = $1', [bookId]);
    if (books.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    const book = books[0];

    try {
      await pool.query(
        `INSERT INTO leads (book_id, username, email, phone)
         VALUES ($1, $2, $3, $4)`,
        [bookId, username, email || null, phone]
      );

      return res.status(201).json({
        message: 'Lead saved successfully',
        pdfUrl: formatMediaUrl(book.pdf_file)
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

    // Format media URLs for all leads
    const leads = rows.map(lead => {
      if (lead.book && lead.book.image) {
        lead.book.image = formatMediaUrl(lead.book.image);
      }
      if (lead.book && lead.book.pdf_file) {
        lead.book.pdf_file = formatMediaUrl(lead.book.pdf_file);
      }
      return lead;
    });

    res.status(200).json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching leads', error });
  }
});

// DELETE a lead by leadId
router.delete('/lead/delete/:leadId', async (req, res) => {
  const { leadId } = req.params;
  const leadIdInt = parseInt(leadId);
  if (isNaN(leadIdInt) || leadIdInt <= 0) return res.status(400).json({ message: 'Invalid leadId' });

  try {
    const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [leadIdInt]);
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
