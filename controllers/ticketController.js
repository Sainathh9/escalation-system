import pool from '../config/db.js'; // Note: You must include the .js extension

export const createTicket = async (req, res) => {
  try {
    const { title, description, severity, category, priority, created_by } =
      req.body;

    const status = "Open";
    const slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const newTicket = await pool.query(
      `INSERT INTO tickets
      (title, description, severity, category, priority, status, created_by, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        title,
        description,
        severity,
        category,
        priority,
        status,
        created_by,
        slaDeadline,
      ]
    );

    res.status(201).json(newTicket.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getAllTickets = async(req,res)=>{
  try{
    const allTickets = await pool.query("SELECT * FROM tickets ORDER BY created_at DESC");
    res.status(200).json(allTickets.rows);
  }catch(err){
    console.log(err.message);
    return res.status(500).json(err.message);
  }
  };

  export const getTicketById = async (req,res)=>{
    try{
      const ticket = await pool.query("SELECT * FROM tickets WHERE id=$1",[req.params.id]);
      res.status(200).json(ticket.rows[0]);
    }catch(err){
      console.log(err.message);
      res.status(500).json(err.message);
    }
  };
