import pool from '../config/db.js'; // Note: You must include the .js extension

export const createTicket = async (req, res) => {
  try {
    const { title, description, severity, category, priority} =
      req.body;

    const status = "Open";
    const slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const newTicket = await pool.query(
      `INSERT INTO tickets
      (title, description, severity, category, priority,created_by, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        title,
        description,
        severity,
        category,
        priority,
        req.user.id,
        slaDeadline,
      ]
    );
    const createdTicket = newTicket.rows[0];

await pool.query(
  "INSERT INTO ticket_logs (ticket_id, action, performed_by, note) VALUES ($1, $2, $3, $4)",
  [
    createdTicket.id,
    "CREATED",
    req.user.id,
    "Ticket created",
  ]
);

    res.status(201).json(createdTicket);
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
      if(ticket.rows.length === 0){
        return res.status(404).json({"error":"Ticket not found"});
      }
      res.status(200).json(ticket.rows[0]);
    }catch(err){
      console.log(err.message);
      res.status(500).json(err.message);
    }
  };

  export const updateTicket = async (req,res)=>{
    try{
    const status = req.body.status;
    const update = await pool.query("UPDATE tickets SET status=$1 WHERE id=$2 RETURNING *",[status,req.params.id]);
     if (update.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const updatedTicket = update.rows[0];
    await pool.query(
      "INSERT INTO ticket_logs (ticket_id,action,performed_by,note) VALUES ($1,$2,$3,$4)",
      [
        updatedTicket.id,
        "STATUS_UPDATED",
        req.user.id, // Assuming performed_by is 1 for now; adjust as needed
        `Status changed to ${status}`
      ]
    )

    res.status(200).json(update.rows[0]);
  }catch(err){
    console.log(err.message);
    res.status(500).json(err.message);
  }
};

  export const assignTicket = async (req,res)=>{
    try{
      const {id} = req.params;
      const {assigned_to} = req.body;
      const assign = await pool.query("UPDATE tickets SET assigned_to=$1 WHERE id=$2 RETURNING *",[assigned_to,id]);
      if(assign.rows.length === 0){
        return res.status(404).json({"error": "Ticket not found"});
      }
      const updatedTicket = assign.rows[0];
      await pool.query(
        "INSERT INTO ticket_logs (ticket_id,action,performed_by,note) VALUES ($1,$2,$3,$4)",
        [
          updatedTicket.id,
          "ASSIGNED",
          req.user.id, // Assuming performed_by is 1 for now; adjust as needed
          `Ticket assigned to user ID ${assigned_to}`
        ]
      )
      res.status(200).json(updatedTicket);

    }catch(err){
      console.log(err.message);
      res.status(500).json(err.message);
    }
  };

 export const createComment = async (req,res)=>{
  try{
    const {id} = req.params;
    const {comment}=req.body;
    const newComment = await pool.query(
      "INSERT INTO ticket_comments (ticket_id,author_id,comment) VALUES ($1,$2,$3) RETURNING *",[
        id,
        req.user.id,
        comment
      ]
    );
    res.status(201).json(newComment.rows[0]);
  }catch(err){
    console.log(err.message);
    res.status(500).json(err.message);
  }
 };

 export const getTicketComments = async (req,res)=>{
  try{
    const {id}=req.params;
    const comments = await pool.query(
      "SELECT * FROM ticket_comments WHERE ticket_id=$1 ORDER BY created_at ASC",[id]
    );
    res.status(200).json(comments.rows);
  }catch(err){
    console.log(err.message);
    res.status(500).json(err.message);
  }
 };