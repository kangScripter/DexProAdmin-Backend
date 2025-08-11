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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'freelance')),
        description TEXT NOT NULL,
        skills TEXT[] NOT NULL,
        requirements TEXT[] NOT NULL,
        compensation TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applicants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        resume_pdf TEXT NOT NULL,
        cover_letter TEXT,
        status TEXT NOT NULL DEFAULT 'new' 
          CHECK (status IN ('new', 'reviewed', 'shortlisted', 'rejected', 'Interviewed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(job_id, email),
        UNIQUE(job_id, phone)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL UNIQUE,
        sub_services TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        selectedServices TEXT[] NOT NULL DEFAULT '{}',
        selectedSubServices JSONB NOT NULL DEFAULT '{}'::jsonb,
        projectTimeline TEXT,
        additionalRequirements TEXT,
        keepUpdated BOOLEAN,
        budgetRange NUMERIC,
        submittedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);        
=======
        await pool.query(`
ALTER TABLE applicants DROP CONSTRAINT applicants_status_check;

ALTER TABLE applicants
ADD CONSTRAINT applicants_status_check 
CHECK (status IN ('New', 'Reviewed', 'Shortlisted', 'Rejected', 'Interviewed'));

    `);

    console.log('Tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables();

