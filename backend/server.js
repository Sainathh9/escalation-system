import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './services/socketService.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import cors from 'cors';
import './workers/slaWorker.js'; // BullMQ SLA escalation worker (side-effect: registers & starts)
import errorHandler from './middleware/errorHandler.js';
import pool from './config/db.js';


// 1. Initialize dotenv at the very top
dotenv.config();

const app = express();


// 2. Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5175',
    'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json());



// Health check
app.get("/",(req,res)=>{
  res.send("<h1>IncidentFlow API — Running</h1>");
});


// 3. Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);

// 4. Centralized Error Handler (must be AFTER routes)
app.use(errorHandler);

// 5. Wrap with HTTP server and init sockets
const server = http.createServer(app);
initSocket(server);

// 6. Start server
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});