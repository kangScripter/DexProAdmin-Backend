const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@dexprosolutions.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists!');
      console.log('Email:', existingUser.rows[0].email);
      console.log('Role:', existingUser.rows[0].role);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const result = await pool.query(`
      INSERT INTO users (
        email, 
        password, 
        phone, 
        first_name, 
        last_name, 
        role, 
        gender, 
        profile_pic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, first_name, last_name, role, created_at;
    `, [
      'admin@dexprosolutions.com',
      hashedPassword,
      '+1234567890',
      'Admin',
      'User',
      1, // Admin role (integer)
      'Male',
      null
    ]);

    const user = result.rows[0];
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password: Admin@123');
    console.log('👤 Name:', user.first_name, user.last_name);
    console.log('🔐 Role:', user.role);
    console.log('🆔 User ID:', user.id);
    console.log('📅 Created:', user.created_at);
    console.log('\n💡 You can now login with:');
    console.log('   Email: admin@dexprosolutions.com');
    console.log('   Password: Admin@123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === '23505') {
      console.log('💡 User with this email already exists');
    } else if (error.code === '42703') {
      console.log('💡 Make sure you have created the users table first');
    }
  } finally {
    await pool.end();
  }
}

// Run the function
createAdminUser(); 