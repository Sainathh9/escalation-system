import express from 'express';
import { createTicket } from '../controllers/ticketController.js';
import {getAllTickets} from '../controllers/ticketController.js';
import {getTicketById} from '../controllers/ticketController.js';
import { get } from 'node:http';

const router = express.Router();

// Logic: POST http://localhost:5001/api/tickets/create
router.post('/', createTicket);
router.get('/:id',getTicketById);
router.get('/',getAllTickets);
export default router;