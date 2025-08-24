// Fix for SERIAL IDs vs UUIDs
// This script helps identify and fix issues when using SERIAL IDs instead of UUIDs

const pool = require('./db');

async function testDatabaseConnection() {
  try {
    // Test database connection
    const result = await pool.query("SELECT NOW() as current_time");
    console.log('✅ Database connection successful');
    console.log('🕐 Current time:', result.rows[0].current_time);
    
    // Check if tables exist and their ID types
    const tables = ['users', 'jobs', 'applicants', 'ebooks', 'blogs', 'services', 'project_requirements', 'newsletter_subscribers'];
    
    for (const table of tables) {
      try {
        const tableInfo = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'id'
        `, [table]);
        
        if (tableInfo.rows.length > 0) {
          const idColumn = tableInfo.rows[0];
          console.log(`📋 ${table} table - ID type: ${idColumn.data_type}`);
        } else {
          console.log(`❌ ${table} table - ID column not found`);
        }
      } catch (error) {
        console.log(`❌ ${table} table - Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Test creating a job to verify SERIAL ID works
async function testJobCreation() {
  try {
    const testJob = await pool.query(`
      INSERT INTO jobs (title, location, type, description, skills, requirements, compensation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, created_at
    `, [
      'Test Job',
      'Test Location',
      'full-time',
      'Test Description',
      ['skill1', 'skill2'],
      ['req1', 'req2'],
      'Test Compensation',
      'open'
    ]);
    
    console.log('✅ Test job created successfully');
    console.log('🆔 Job ID:', testJob.rows[0].id);
    console.log('📝 Job Title:', testJob.rows[0].title);
    
    // Clean up test job
    await pool.query('DELETE FROM jobs WHERE id = $1', [testJob.rows[0].id]);
    console.log('🧹 Test job cleaned up');
    
  } catch (error) {
    console.error('❌ Test job creation failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🔍 Testing SERIAL ID compatibility...\n');
  
  await testDatabaseConnection();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testJobCreation();
  
  console.log('\n✅ All tests completed!');
}

runTests(); 