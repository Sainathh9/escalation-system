import express from 'express';
import { createTicket } from '../controllers/ticketController.js';
import {getAllTickets} from '../controllers/ticketController.js';
import {getTicketById} from '../controllers/ticketController.js';
import {updateTicket} from '../controllers/ticketController.js';
import {assignTicket} from '../controllers/ticketController.js';
import {createComment} from '../controllers/ticketController.js';
import { getTicketComments } from '../controllers/ticketController.js';
import authMiddleWare from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleWare);

// Logic: POST http://localhost:5001/api/tickets/create
router.post('/',createTicket);
router.get('/:id',getTicketById);
router.get('/',getAllTickets);
router.put('/:id/status',updateTicket);
router.put('/:id/assign',assignTicket);
router.post('/:id/comments',createComment);
router.get('/:id/comments',getTicketComments);
export default router;