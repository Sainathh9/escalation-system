import dotenv from 'dotenv';
import { sendGenericNotificationEmail } from './services/emailService.js';

// Load environment variables
dotenv.config();

const testSMTPConfig = async () => {
  console.log('--- IncidentOps SMTP Verification ---');
  console.log('Checking environment variables...');
  
  if (!process.env.EMAIL_ENABLED || process.env.EMAIL_ENABLED !== 'true') {
    console.warn('⚠️ EMAIL_ENABLED is not set to true in .env');
  } else {
    console.log('✅ EMAIL_ENABLED is true');
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Missing EMAIL_USER or EMAIL_PASS in .env');
    console.log('Please configure your credentials before testing.');
    process.exit(1);
  } else {
    console.log(`✅ EMAIL_USER is configured as: ${process.env.EMAIL_USER}`);
    console.log('✅ EMAIL_PASS is present');
  }

  console.log('\nAttempting to send a test email to the configured EMAIL_USER...');
  
  const dummyTicket = {
    id: 'TEST-999',
    title: 'SMTP Configuration Test Ticket',
    priority: 1,
    status: 'Open',
    assigned_to_name: 'Unassigned',
    escalation_level: 0
  };

  try {
    // We send the test email to the configured EMAIL_USER so the admin gets it.
    await sendGenericNotificationEmail(
      process.env.EMAIL_USER,
      'IncidentOps Administrator',
      '[IncidentOps] SMTP Configuration Test Successful',
      'SMTP Configuration Verification',
      'If you are reading this email, your IncidentOps MERN application has successfully connected to the Gmail SMTP server. Email notifications are now fully operational!',
      dummyTicket
    );
    
    console.log('\n🎉 TEST COMPLETE: If the SMTP connection was successful, you should see a success log above and an email in your inbox soon.');
  } catch (error) {
    console.error('\n❌ SMTP TEST FAILED:');
    console.error(error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure you are using a 16-character Google App Password, not your normal Google password.');
    console.log('2. Check if your network blocks outbound port 587/465.');
  }
};

testSMTPConfig();
