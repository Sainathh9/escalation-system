import express from 'express';
import { createTicket } from '../controllers/ticketController.js';

const router = express.Router();

// Logic: POST http://localhost:3000/api/tickets/create
router.post('/create', createTicket);

export default router;