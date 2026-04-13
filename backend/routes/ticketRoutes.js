import express from 'express';
import { createTicket } from '../controllers/ticketController.js';
import {getAllTickets} from '../controllers/ticketController.js';
import {getTicketById} from '../controllers/ticketController.js';
import {updateTicket} from '../controllers/ticketController.js';
import {assignTicket} from '../controllers/ticketController.js';
import {createComment} from '../controllers/ticketController.js';
import { getTicketComments } from '../controllers/ticketController.js';
import {authMiddleWare} from '../middleware/authMiddleware.js';
import {allowRoles} from '../middleware/authMiddleware.js';
import { getMetrics } from '../controllers/ticketController.js';
import { getTicketLogs } from '../controllers/ticketController.js';

const router = express.Router();
router.use(authMiddleWare);

// Logic: POST http://localhost:5001/api/tickets/create
router.get('/metrics', allowRoles(['Admin']), getMetrics);
router.get('/:id/logs',allowRoles(['User','Technician','Admin']),getTicketLogs);
router.post('/',createTicket); //you dont need role middleware here as all roles are allowed
router.get('/:id',allowRoles(['User','Technician','Admin']),getTicketById);//change logic
router.get('/',allowRoles(['User','Technician','Admin']),getAllTickets);
router.put('/:id/status',allowRoles(['Technician','Admin']),updateTicket);
router.put('/:id/assign',allowRoles(['Admin']),assignTicket);
router.post('/:id/comments',createComment);
router.get('/:id/comments',getTicketComments);




export default router;