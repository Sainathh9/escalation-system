import pool from '../config/db.js';
import cron from 'node-cron';
//This algorithm runs every one minute to check for tickets that have their deadline crossed and incrementing their escalation level.
export const runEscalationCheck = async ()=>{
    try{
        const currentTime = new Date(); // Get the current time
        const overdueTickets = await pool.query("SELECT * from tickets WHERE sla_deadline<$1 AND status NOT IN ('Resolved','Closed')",[currentTime]); //query in double quotes and params in single
        console.log(`Escalation check: ${overdueTickets.rows.length} overdue tickets`);
        for(const ticket of overdueTickets.rows){
            const newEscalationLevel = ticket.escalation_level+1;
            const newSlaDeadline = new Date(Date.now()+60*60*1000); // Set new deadline to 1 hour from now,adjustable
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

cron.schedule('*/1 * * * *',()=>{ //cron schedules every one minute,adjustable
    runEscalationCheck();
})

export default runEscalationCheck;