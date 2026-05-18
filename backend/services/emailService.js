import nodemailer from 'nodemailer';

// Create and configure the Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Core sending function with validation and error handling
const sendMailAsync = async (to, subject, html) => {
  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log('[EmailService] Email sending is disabled. Skipping.');
    return;
  }
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EmailService] Warning: Missing EMAIL_USER or EMAIL_PASS in .env. Skipping email.');
    return;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"IncidentOps" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] ✅ Email successfully sent to ${to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[EmailService] ❌ Failed to send email to ${to}:`, error.message);
  }
};

// Base HTML Template
const getHtmlTemplate = (title, message, ticket, color = "#2563eb") => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">IncidentOps Notification</h2>
      </div>
      <div style="padding: 20px; color: #374151;">
        <h3 style="margin-top: 0; color: #111827;">${title}</h3>
        <p style="font-size: 15px; line-height: 1.6;">${message}</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> #${ticket.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 10px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
          <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 0 0 10px 0;"><strong>Assigned To:</strong> ${ticket.assigned_to_name || 'Unassigned'}</p>
          ${ticket.escalation_level ? `<p style="margin: 0; color: #dc2626;"><strong>Escalation Level:</strong> ${ticket.escalation_level}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.id}" 
             style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            View Ticket
          </a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0;">This is an automated notification from IncidentOps. Please do not reply.</p>
      </div>
    </div>
  `;
};

// 1. Ticket Created Email
export const sendTicketCreatedEmail = async (to, userName, ticket) => {
  const subject = `[IncidentOps] New Ticket #${ticket.id} Created`;
  const message = `Hello ${userName},<br><br>A new ticket has been successfully created in the system. Please review the details below.`;
  const html = getHtmlTemplate('New Ticket Created', message, ticket, '#3b82f6'); // Blue
  await sendMailAsync(to, subject, html);
};

// 2. Ticket Assigned Email
export const sendTicketAssignedEmail = async (to, userName, ticket) => {
  const subject = `[IncidentOps] Ticket #${ticket.id} Assigned To You`;
  const message = `Hello ${userName},<br><br>You have been assigned to a ticket. Immediate action may be required depending on its priority and SLA.`;
  const html = getHtmlTemplate('Ticket Assigned', message, ticket, '#f59e0b'); // Amber
  await sendMailAsync(to, subject, html);
};

// 3. Ticket Escalated Email
export const sendTicketEscalatedEmail = async (to, userName, ticket, escalationLevel) => {
  const subject = `[IncidentOps] 🚨 URGENT: Ticket #${ticket.id} Escalated (Level ${escalationLevel})`;
  const message = `Hello ${userName},<br><br><strong>URGENT NOTIFICATION:</strong> A ticket has breached its Service Level Agreement (SLA) and has been escalated to Level ${escalationLevel}. Immediate administrative intervention is required.`;
  const html = getHtmlTemplate('Ticket Escalated', message, ticket, '#dc2626'); // Red
  await sendMailAsync(to, subject, html);
};

// 4. Ticket Resolved Email
export const sendTicketResolvedEmail = async (to, userName, ticket) => {
  const subject = `[IncidentOps] ✅ Ticket #${ticket.id} Resolved`;
  const message = `Hello ${userName},<br><br>Your ticket has been marked as resolved by the assigned technician. If you have further issues, please update the ticket.`;
  const html = getHtmlTemplate('Ticket Resolved', message, ticket, '#10b981'); // Green
  await sendMailAsync(to, subject, html);
};

// 5. Generic Notification (for comments, etc.)
export const sendGenericNotificationEmail = async (to, userName, subject, title, messageText, ticket) => {
  const message = `Hello ${userName},<br><br>${messageText}`;
  const html = getHtmlTemplate(title, message, ticket, '#6b7280'); // Gray
  await sendMailAsync(to, subject, html);
};
