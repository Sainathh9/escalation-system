import pool from './config/db.js';
import bcrypt from 'bcrypt';

async function seedData() {
  try {
    console.log("Starting sample data seeding...");

    // 1. Generate password hash for '1234'
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('1234', saltRounds);

    // 2. Insert or update Admin user 'hi@gm.com'
    let adminId = null;
    const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'hi@gm.com'");
    if (adminCheck.rows.length > 0) {
      adminId = adminCheck.rows[0].id;
      await pool.query(
        "UPDATE users SET name = 'System Admin', password_hash = $1, role = 'Admin' WHERE id = $2",
        [passwordHash, adminId]
      );
      console.log(`Updated existing Admin (ID: ${adminId})`);
    } else {
      const adminInsert = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('System Admin', 'hi@gm.com', $1, 'Admin') RETURNING id",
        [passwordHash]
      );
      adminId = adminInsert.rows[0].id;
      console.log(`Created new Admin (ID: ${adminId})`);
    }

    // 3. Insert or update Technician user 'tech@test.com'
    let techId = null;
    const techCheck = await pool.query("SELECT id FROM users WHERE email = 'tech@test.com'");
    if (techCheck.rows.length > 0) {
      techId = techCheck.rows[0].id;
      await pool.query(
        "UPDATE users SET name = 'Primary NOC Tech', password_hash = $1, role = 'Technician' WHERE id = $2",
        [passwordHash, techId]
      );
      console.log(`Updated existing Technician (ID: ${techId})`);
    } else {
      const techInsert = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Primary NOC Tech', 'tech@test.com', $1, 'Technician') RETURNING id",
        [passwordHash]
      );
      techId = techInsert.rows[0].id;
      console.log(`Created new Technician (ID: ${techId})`);
    }

    // 4. Delete existing tickets assigned to this technician to start fresh
    await pool.query("DELETE FROM ticket_comments WHERE ticket_id IN (SELECT id FROM tickets WHERE assigned_to = $1)", [techId]);
    await pool.query("DELETE FROM ticket_logs WHERE ticket_id IN (SELECT id FROM tickets WHERE assigned_to = $1)", [techId]);
    await pool.query("DELETE FROM tickets WHERE assigned_to = $1", [techId]);
    console.log("Cleaned up old tickets assigned to this technician.");

    // 5. Define our detailed realistic incident dataset
    const now = new Date();

    const tickets = [
      {
        title: "CRITICAL: Prod Database Failover - Primary Node Unreachable",
        description: "Primary PostgreSQL instance on port 5432 has stopped responding to health checks. Connections are failing with 'Connection Refused'. Failover sequence initiated but replica lag is blocking automation.",
        category: "Database",
        severity: "Critical",
        priority: 1,
        status: "In-Progress",
        escalation_level: 3,
        created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        sla_deadline: new Date(now.getTime() - 3.9 * 60 * 60 * 1000), // 3.9 hours ago (Breached!)
        resolved_at: null,
        logs: [
          { timeOffset: -4 * 60 * 60 * 1000, action: "CREATED", performer: adminId, note: "Ticket logged automatically via PagerDuty webhook alert." },
          { timeOffset: -4 * 60 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Ticket assigned to database primary technician." },
          { timeOffset: -3.8 * 60 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to In-Progress: Investigating replica sync lag before forcing DB switchover." },
          { timeOffset: -3.5 * 60 * 60 * 1000, action: "ESCALATED", performer: null, note: "SLA breached. Escalated to level 2 automatically by SLA monitor." },
          { timeOffset: -3.0 * 60 * 60 * 1000, action: "ESCALATED", performer: null, note: "SLA breached. Escalated to level 3 automatically by SLA monitor." }
        ],
        comments: [
          { timeOffset: -3.7 * 60 * 60 * 1000, author: adminId, comment: "Customer-facing portal is displaying 504 Gateway Timeouts. Any update on the replication recovery?" },
          { timeOffset: -3.6 * 60 * 60 * 1000, author: techId, comment: "Replica node 2 is currently 50GB behind primary. If we force switchover now, we will lose transactions. I am running a point-in-time recovery scan on node 1 to see if we can revive it." }
        ]
      },
      {
        title: "HIGH: Bastion Host SSH Brute Force Attack",
        description: "Intrusion detection system flagged over 450 failed SSH attempts on bastion-01 within a 3-minute window from IP address 185.220.101.5. Automated firewall rules blocked the IP temporarily, but requires immediate root cause analysis and permanent IP ban.",
        category: "Security",
        severity: "High",
        priority: 2,
        status: "Open",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
        sla_deadline: new Date(now.getTime() + 2 * 60 * 1000), // 2 minutes in the future (approaching breach!)
        resolved_at: null,
        logs: [
          { timeOffset: -10 * 60 * 1000, action: "CREATED", performer: adminId, note: "Security incident created." },
          { timeOffset: -9 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Ticket assigned to primary security operations tech." }
        ],
        comments: []
      },
      {
        title: "HIGH: Checkout API Gateway Latency Spike",
        description: "Datadog APM reports p99 response times for /v2/checkout are at 4.2 seconds. High connection pool utilization on redis cache cluster suspected. Customers reporting page load sluggishness.",
        category: "Software",
        severity: "High",
        priority: 2,
        status: "In-Progress",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 40 * 60 * 1000), // 40 mins ago
        sla_deadline: new Date(now.getTime() + 80 * 60 * 1000), // 80 mins in future (on-track)
        resolved_at: null,
        logs: [
          { timeOffset: -40 * 60 * 1000, action: "CREATED", performer: adminId, note: "Gateway latency alert triggered." },
          { timeOffset: -38 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Assigned to software platform team." },
          { timeOffset: -35 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to In-Progress: Inspecting redis cluster memory and connection pool limits." }
        ],
        comments: [
          { timeOffset: -30 * 60 * 1000, author: techId, comment: "Confirmed redis connection pool is saturated at 100% capacity. Increasing max client pool limit temporarily via AWS Elasticache." }
        ]
      },
      {
        title: "MEDIUM: Kubernetes Worker Node Memory Exhaustion",
        description: "Memory utilization on worker node ip-10-0-4-82 is at 94% with kubelet logging Out-Of-Memory events for minor daemonsets. Rescheduling non-essential pods to other node groups is required to prevent node disruption.",
        category: "Network", // Fits in NOC categories
        severity: "Medium",
        priority: 3,
        status: "Open",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
        sla_deadline: new Date(now.getTime() + 135 * 60 * 1000), // 135 mins in future (on-track)
        resolved_at: null,
        logs: [
          { timeOffset: -45 * 60 * 1000, action: "CREATED", performer: adminId, note: "Kubernetes node health alert." },
          { timeOffset: -44 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Assigned to platform engineer." }
        ],
        comments: []
      },
      {
        title: "MEDIUM: Office Wi-Fi Access Point AP-04 Offline",
        description: "Employees on the 3rd floor are reporting loss of connection to corporate Wi-Fi. Access Point AP-04 is completely down and not responding to ICMP ping.",
        category: "Hardware",
        severity: "Medium",
        priority: 3,
        status: "Resolved",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 2.5 * 60 * 60 * 1000), // 2.5 hrs ago
        sla_deadline: new Date(now.getTime() + 30 * 60 * 1000), // SLA would be 30 mins in future
        resolved_at: new Date(now.getTime() - 30 * 60 * 1000), // Resolved 30 mins ago
        logs: [
          { timeOffset: -2.5 * 60 * 60 * 1000, action: "CREATED", performer: adminId, note: "Incident created." },
          { timeOffset: -2.4 * 60 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Assigned to hardware and workplace tech." },
          { timeOffset: -2.0 * 60 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to In-Progress: Traveling to the 3rd floor closet to inspect the AP hardware." },
          { timeOffset: -30 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to Resolved: Cable connection re-seated and telemetry confirmed." }
        ],
        comments: [
          { timeOffset: -45 * 60 * 1000, author: techId, comment: "Physically inspected the access point on the ceiling. The PoE Ethernet connector on the patch panel was loose. Re-seated the cable, and verified that AP is drawing power and broadcasting SSID." }
        ]
      },
      {
        title: "LOW: Renew SSL Certificates for Internal Development Domains",
        description: "SSL certificates for the internal development domain *.dev.incidentflow.local will expire in 14 days. Generate new Let's Encrypt certificates and update the Kubernetes ingress controller config map.",
        category: "Security",
        severity: "Low",
        priority: 4,
        status: "Open",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hrs ago
        sla_deadline: new Date(now.getTime() + 21 * 60 * 60 * 1000), // 21 hrs in future
        resolved_at: null,
        logs: [
          { timeOffset: -3 * 60 * 60 * 1000, action: "CREATED", performer: adminId, note: "Scheduled maintenance ticket created." },
          { timeOffset: -2.9 * 60 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Assigned to operations tech." }
        ],
        comments: []
      },
      {
        title: "LOW: Developer Sandbox Staging DB Disk Full",
        description: "Staging database sandbox disk is at 99% usage. Old log files and test backups need to be pruned to avoid lock-ups.",
        category: "Database",
        severity: "Low",
        priority: 4,
        status: "Resolved",
        escalation_level: 1,
        created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hrs ago
        sla_deadline: new Date(now.getTime() + 19 * 60 * 60 * 1000), // 19 hrs in future
        resolved_at: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Resolved 1 hr ago
        logs: [
          { timeOffset: -5 * 60 * 60 * 1000, action: "CREATED", performer: adminId, note: "Disk low space alert." },
          { timeOffset: -4.8 * 60 * 60 * 1000, action: "ASSIGNED", performer: adminId, note: "Assigned to database support tech." },
          { timeOffset: -4.5 * 60 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to In-Progress: Running storage analyzer on DB mount volume." },
          { timeOffset: -1 * 60 * 60 * 1000, action: "STATUS_CHANGED", performer: techId, note: "Status updated to Resolved: Cleared staging tables and logs." }
        ],
        comments: [
          { timeOffset: -1 * 60 * 60 * 1000, author: techId, comment: "Purged old PostgreSQL wal logs and truncated testing databases. Disk usage is now back down to 34% capacity." }
        ]
      }
    ];

    // 6. Insert tickets and associated logs/comments
    for (const ticket of tickets) {
      // Insert Ticket
      const ticketRes = await pool.query(`
        INSERT INTO tickets 
        (title, description, category, severity, priority, status, escalation_level, created_at, sla_deadline, resolved_at, created_by, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.severity,
        ticket.priority,
        ticket.status,
        ticket.escalation_level,
        ticket.created_at,
        ticket.sla_deadline,
        ticket.resolved_at,
        adminId,
        techId
      ]);

      const tId = ticketRes.rows[0].id;
      console.log(`Inserted ticket "${ticket.title}" (ID: ${tId})`);

      // Insert Logs
      for (const log of ticket.logs) {
        const logTime = new Date(now.getTime() + log.timeOffset);
        await pool.query(`
          INSERT INTO ticket_logs (ticket_id, performed_by, action, note, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [tId, log.performer, log.action, log.note, logTime]);
      }

      // Insert Comments
      for (const comment of ticket.comments) {
        const commentTime = new Date(now.getTime() + comment.timeOffset);
        await pool.query(`
          INSERT INTO ticket_comments (ticket_id, author_id, comment, created_at)
          VALUES ($1, $2, $3, $4)
        `, [tId, comment.author, comment.comment, commentTime]);
      }
    }

    console.log("✅ Successfully seeded rich, operational database records for Technician tech@test.com!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Data seeding failed:", error);
    process.exit(1);
  }
}

seedData();
