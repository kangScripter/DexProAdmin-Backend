const pool = require('./db');

async function testEbooksSerial() {
  try {
    console.log('🧪 Testing ebooks functionality with SERIAL IDs...\n');

    // Test 1: Create an ebook
    console.log('1. Creating test ebook...');
    const ebookResult = await pool.query(`
      INSERT INTO ebooks (title, description, highlights, image, pdf_file)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description
    `, [
      'Test Ebook',
      'This is a test ebook description',
      ['highlight1', 'highlight2'],
      'https://example.com/image.jpg',
      'https://example.com/ebook.pdf'
    ]);

    const ebook = ebookResult.rows[0];
    console.log(`✅ Test ebook created with ID: ${ebook.id}`);
    console.log(`   Title: ${ebook.title}`);
    console.log(`   Description: ${ebook.description}`);

    // Test 2: Create a lead for the ebook
    console.log('\n2. Creating test lead...');
    const leadResult = await pool.query(`
      INSERT INTO leads (book_id, username, email, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, book_id
    `, [
      ebook.id,
      'Test User',
      'test@example.com',
      '+1234567890'
    ]);

    const lead = leadResult.rows[0];
    console.log(`✅ Test lead created with ID: ${lead.id}`);
    console.log(`   Username: ${lead.username}`);
    console.log(`   Email: ${lead.email}`);
    console.log(`   Book ID: ${lead.book_id}`);

    // Test 3: Update the ebook
    console.log('\n3. Updating test ebook...');
    const updateResult = await pool.query(`
      UPDATE ebooks
      SET title = $1, description = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, title, description
    `, [
      'Updated Test Ebook',
      'This is an updated test ebook description',
      ebook.id
    ]);

    const updatedEbook = updateResult.rows[0];
    console.log(`✅ Test ebook updated`);
    console.log(`   New Title: ${updatedEbook.title}`);
    console.log(`   New Description: ${updatedEbook.description}`);

    // Test 4: Get all ebooks
    console.log('\n4. Fetching all ebooks...');
    const allEbooks = await pool.query('SELECT id, title FROM ebooks ORDER BY created_at DESC');
    console.log(`✅ Found ${allEbooks.rows.length} ebooks`);

    // Test 5: Get all leads
    console.log('\n5. Fetching all leads...');
    const allLeads = await pool.query(`
      SELECT l.id, l.username, e.title as book_title
      FROM leads l
      JOIN ebooks e ON l.book_id = e.id
      ORDER BY l.created_at DESC
    `);
    console.log(`✅ Found ${allLeads.rows.length} leads`);

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    await pool.query('DELETE FROM ebooks WHERE id = $1', [ebook.id]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All ebooks tests passed! SERIAL IDs work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('gen_random_uuid')) {
      console.log('\n💡 This error suggests there might still be a gen_random_uuid() reference.');
      console.log('   Make sure you\'ve updated the database schema to use SERIAL IDs.');
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testEbooksSerial(); 