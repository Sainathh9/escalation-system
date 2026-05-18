import pool from './config/db.js';

const migrate = async () => {
  try {
    console.log("Starting database migrations...");

    // Add escalation_level if it doesn't exist
    await pool.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 1;
    `);
    console.log("✅ Added escalation_level column");

    // Add performance indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);`);
    console.log("✅ Created performance indexes");

    console.log("Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
