import pool from '../config/db.js';
import cron from 'node-cron';
import calculateSLA from '../utils/slaCalculator.js';
import {
  notifySLAWarning,
  notifyTicketEscalated,
} from '../services/notificationService.js';


//This algorithm runs every one minute to check for tickets that have their deadline crossed and incrementing their escalation level.


export const runEscalationCheck = async ()=>{
    try{
        const currentTime = new Date(); // Get the current time


        const overdueTickets = await pool.query("SELECT * from tickets WHERE sla_deadline<$1 AND status NOT IN ('Resolved','Closed')",[currentTime]); //query in double quotes and params in single
        console.log(`Escalation check: ${overdueTickets.rows.length} overdue tickets`);

        
        for(const ticket of overdueTickets.rows){
            if(ticket.escalation_level >= 3){
                // Notify admins that ticket is at max escalation
                notifyTicketEscalated(ticket, ticket.escalation_level).catch(() => {});
                
                // 🐛 FIX: Update the SLA deadline so it doesn't trigger every single minute!
                const newSlaDeadline = calculateSLA(ticket.severity, 3);
                await pool.query("UPDATE tickets SET sla_deadline=$1 WHERE id=$2",[
                    newSlaDeadline,
                    ticket.id
                ]);
                
                continue;
            }

           const newEscalationLevel = Math.min(ticket.escalation_level + 1, 3);

            const newSlaDeadline = calculateSLA(ticket.severity, newEscalationLevel);
            await pool.query("UPDATE tickets SET escalation_level=$1,sla_deadline=$2 WHERE id=$3",[
                newEscalationLevel,
                newSlaDeadline,
                ticket.id
            ]);

            await pool.query("INSERT INTO ticket_logs(ticket_id,action,performed_by,note) VALUES($1,$2,$3,$4)",[
                ticket.id,
                "ESCALATED",
                null,
                `Escalated to level ${newEscalationLevel} due to SLA breach`
            ]);

            // 🔔 Notify assigned technician (SLA warning) and admins (escalation)
            notifySLAWarning(ticket).catch(() => {});
            notifyTicketEscalated(ticket, newEscalationLevel).catch(() => {});

            console.log(`Notifications fired for ticket ${ticket.id} at escalation level ${newEscalationLevel}`);
        }
       
    }
    catch(err){
        console.log(err.message);
    }
};

cron.schedule('*/1 * * * *',()=>{ //cron schedules every 5 minute,adjustable
    runEscalationCheck();
})

export default runEscalationCheck;