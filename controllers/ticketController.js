import pool from '../config/db.js'; // Note: You must include the .js extension

export const createTicket = async (req, res) => {
  try {
    const { title, description, severity } = req.body;
    const newTicket = await pool.query(
      "INSERT INTO tickets (title, description, severity) VALUES ($1, $2, $3) RETURNING *",
      [title, description, severity]
    );
    res.status(201).json(newTicket.rows[0]);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};