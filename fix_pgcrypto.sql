-- Fix for gen_random_uuid() function not existing
-- Run this script in your PostgreSQL database

-- 1. Create the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 3. Test the gen_random_uuid() function
SELECT gen_random_uuid();

-- 4. If you still get errors, you can use uuid-ossp as an alternative
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 5. Test uuid_generate_v4() function
SELECT uuid_generate_v4(); 