/**
 * migrateNotifications.js
 * Run with: node migrateNotifications.js
 *
 * Creates the notifications table and adds required indexes.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */

import pool from './config/db.js';

const migrate = async () => {
  try {
    console.log('🚀 Running notifications migration...');

    // Create the notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_id   INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,
        message     TEXT NOT NULL,
        is_read     BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ notifications table ready');

    // Performance indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
        ON notifications(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
        ON notifications(user_id, is_read)
        WHERE is_read = false;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON notifications(created_at DESC);
    `);
    console.log('✅ Indexes created');

    console.log('✅ Notifications migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
