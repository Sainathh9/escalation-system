import express from 'express';
import dotenv from 'dotenv';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';
import checkEscalation from './jobs/escalationJob.js';

// 1. Initialize dotenv at the very top
dotenv.config();

const app = express();


// 2. Middleware
app.use(express.json());
app.use(cors());


//server run check
app.get("/",(req,res)=>{
  res.send("<h1>hello world</h1>");
});


// 3. Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth',authRoutes);


// 4. Use the Port from .env, or fallback to 3000 if it's missing
const PORT = process.env.PORT || 5001;



app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});