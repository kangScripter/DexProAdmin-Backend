-- Create First Admin User for DexPro Admin Backend
-- This script creates the initial admin user for login access

-- For UUID-based tables (if using cpanel_tables.sql)
-- Password: Admin@123 (bcrypt hashed)
INSERT INTO users (
  id,
  email,
  password,
  phone,
  first_name,
  last_name,
  role,
  gender,
  profile_pic,
  created_at,
  updated_at
) VALUES (
  uuid_generate_v4(),
  'admin@dexprosolutions.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@123
  '+1234567890',
  'Admin',
  'User',
  1, -- Admin role
  'Male',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Alternative for SERIAL-based tables (if using cpanel_tables_serial.sql)
-- Uncomment the following if you're using SERIAL IDs:
/*
INSERT INTO users (
  email,
  password,
  phone,
  first_name,
  last_name,
  role,
  gender,
  profile_pic,
  created_at,
  updated_at
) VALUES (
  'admin@dexprosolutions.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@123
  '+1234567890',
  'Admin',
  'User',
  1, -- Admin role
  'Male',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
*/

-- Verify the user was created
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM users 
WHERE email = 'admin@dexprosolutions.com'; 