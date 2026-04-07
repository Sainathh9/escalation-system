import pool from '../config/db.js';
import cron from 'node-cron';
import calculateSLA  from '../utils/slaCalculator.js';


//This algorithm runs every one minute to check for tickets that have their deadline crossed and incrementing their escalation level.


export const runEscalationCheck = async ()=>{
    try{
        const currentTime = new Date(); // Get the current time
        const overdueTickets = await pool.query("SELECT * from tickets WHERE sla_deadline<$1 AND status NOT IN ('Resolved','Closed')",[currentTime]); //query in double quotes and params in single
        console.log(`Escalation check: ${overdueTickets.rows.length} overdue tickets`);
        for(const ticket of overdueTickets.rows){
            if(ticket.escalation_level>=3)continue; //notify admin here, add it later
           const newEscalationLevel = Math.min(ticket.escalation_level + 1, 3);
            const newSlaDeadline =  calculateSLA(ticket.severity,newEscalationLevel); //call the function
            await pool.query("UPDATE tickets SET escalation_level=$1,sla_deadline=$2 WHERE id=$3",[
                newEscalationLevel,
                newSlaDeadline,
                ticket.id
            ]);
            await pool.query("INSERT INTO ticket_logs(ticket_id,action,performed_by,note) VALUES($1,$2,$3,$4)",[
                ticket.id,
                "ESCALATED",
                null, //performed_by is null because it's an automated action
                `Escalated to level ${newEscalationLevel} due to SLA breach`
            ]);
        }
    }
    catch(err){
        console.log(err.message);
    }
};

cron.schedule('*/5 * * * *',()=>{ //cron schedules every 5 minute,adjustable
    runEscalationCheck();
})

export default runEscalationCheck;