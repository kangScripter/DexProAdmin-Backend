const pool = require('./db');

async function createTables() {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ebooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        highlights TEXT[] NOT NULL DEFAULT '{}',
        image TEXT,
        pdf_file TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (book_id, email),
        UNIQUE (book_id, phone)
      );
    `);

    console.log('Tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables();
