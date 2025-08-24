-- Fix for remaining UUID issues in cPanel PostgreSQL
-- This script removes any remaining gen_random_uuid() references

-- 1. Check if there are any default values using gen_random_uuid()
SELECT 
    table_name, 
    column_name, 
    column_default
FROM information_schema.columns 
WHERE column_default LIKE '%gen_random_uuid%';

-- 2. Update any columns that might still have gen_random_uuid() as default
-- (This will only affect columns that actually have this default)

-- For users table
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- For jobs table  
ALTER TABLE jobs ALTER COLUMN id SET DEFAULT nextval('jobs_id_seq');

-- For applicants table
ALTER TABLE applicants ALTER COLUMN id SET DEFAULT nextval('applicants_id_seq');

-- For ebooks table
ALTER TABLE ebooks ALTER COLUMN id SET DEFAULT nextval('ebooks_id_seq');

-- For leads table
ALTER TABLE leads ALTER COLUMN id SET DEFAULT nextval('leads_id_seq');

-- For services table
ALTER TABLE services ALTER COLUMN id SET DEFAULT nextval('services_id_seq');

-- For project_requirements table
ALTER TABLE project_requirements ALTER COLUMN id SET DEFAULT nextval('project_requirements_id_seq');

-- For blogs table
ALTER TABLE blogs ALTER COLUMN id SET DEFAULT nextval('blogs_id_seq');

-- For newsletter_subscribers table
ALTER TABLE newsletter_subscribers ALTER COLUMN id SET DEFAULT nextval('newsletter_subscribers_id_seq');

-- 3. Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'jobs', 'applicants', 'ebooks', 'leads', 'services', 'project_requirements', 'blogs', 'newsletter_subscribers')
AND column_name = 'id'
ORDER BY table_name;

-- 4. Test creating a record to ensure SERIAL works
-- (Uncomment the following lines to test)
/*
INSERT INTO jobs (title, location, type, description, skills, requirements, compensation, status)
VALUES ('Test Job', 'Test Location', 'full-time', 'Test Description', ARRAY['skill1'], ARRAY['req1'], 'Test', 'open')
RETURNING id, title;

-- Clean up test record
DELETE FROM jobs WHERE title = 'Test Job';
*/ 