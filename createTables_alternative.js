const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

async function createTables() {
  try {
    // Create users table with OTP support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        first_name TEXT,
        last_name TEXT,
        role INTEGER DEFAULT 1,
        gender TEXT,
        profile_pic TEXT,
        reset_otp TEXT,
        reset_otp_expiry TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

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

    // Create blogs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        short_desc TEXT,
        content TEXT,
        featured_image TEXT,
        category TEXT,
        author_id UUID,
        tags TEXT[] DEFAULT '{}',
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT[] DEFAULT '{}',
        canonical_url TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_time TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_pinned BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        visibility TEXT DEFAULT 'public',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create newsletter_subscribers table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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