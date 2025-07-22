const cron = require('node-cron');
const db = require('./db'); // Your PG connection module

// Every minute check for due scheduled posts
cron.schedule('* * * * *', async () => {
  try {
    const result = await db.query(`
      UPDATE blogs
      SET status = 'Published', published_at = NOW()
      WHERE status = 'Scheduled' AND scheduled_time <= NOW()
      RETURNING id, title
    `);

    result.rows.forEach((blog) => {
      console.log(`📢 Published scheduled blog: ${blog.title}`);
    });
  } catch (err) {
    console.error('Scheduled publish error:', err);
  }
});
