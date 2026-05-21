import {Queue} from 'bullmq';
import connection from '../config/redis.js';

const slaQueue = new Queue("sla-escalation",{connection});

export default slaQueue;