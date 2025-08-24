const pool = require('./db');

async function testApplicantCreation() {
  try {
    console.log('🧪 Testing applicant creation...\n');

    // First, create a test job
    console.log('1. Creating test job...');
    const jobResult = await pool.query(`
      INSERT INTO jobs (title, location, type, description, skills, requirements, compensation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title
    `, [
      'Test Job for Applicant',
      'Test Location',
      'full-time',
      'Test Job Description',
      ['JavaScript', 'Node.js'],
      ['2+ years experience'],
      'Competitive salary',
      'open'
    ]);

    const jobId = jobResult.rows[0].id;
    console.log(`✅ Test job created with ID: ${jobId}`);

    // Now create a test applicant
    console.log('\n2. Creating test applicant...');
    const applicantResult = await pool.query(`
      INSERT INTO applicants (job_id, name, email, phone, resume_pdf, cover_letter, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, job_id, status
    `, [
      jobId,
      'Test Applicant',
      'test@example.com',
      '+1234567890',
      'https://example.com/resume.pdf',
      'This is a test cover letter',
      'new'
    ]);

    const applicant = applicantResult.rows[0];
    console.log(`✅ Test applicant created with ID: ${applicant.id}`);
    console.log(`   Name: ${applicant.name}`);
    console.log(`   Email: ${applicant.email}`);
    console.log(`   Job ID: ${applicant.job_id}`);
    console.log(`   Status: ${applicant.status}`);

    // Clean up test data
    console.log('\n3. Cleaning up test data...');
    await pool.query('DELETE FROM applicants WHERE id = $1', [applicant.id]);
    await pool.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Applicant creation works correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('gen_random_uuid')) {
      console.log('\n💡 This error suggests there might still be a gen_random_uuid() reference somewhere.');
      console.log('   Try running the fix_uuid_issues.sql script in your database.');
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testApplicantCreation(); 