// Native fetch is used

async function run() {
  const baseUrl = 'http://localhost:5001/api';

  console.log('1. Registering/Logging in test user...');
  let res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password' })
  });

  if (res.status === 401) {
    console.log('User not found, creating user...');
    res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password' })
    });
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });
  }

  const data = await res.json();
  if (!data.success) {
    console.error('Login failed:', data);
    return;
  }
  const token = data.data.token;
  console.log('Logged in successfully, token:', token.substring(0, 10) + '...');

  console.log('2. Creating a Critical ticket (6 second SLA)...');
  res = await fetch(`${baseUrl}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Workflow Test Ticket',
      description: 'Checking if SLA worker picks this up',
      severity: 'Critical',
      category: 'General',
      priority: 1
    })
  });

  const ticketData = await res.json();
  if (!ticketData.success) {
    console.error('Ticket creation failed:', ticketData);
    return;
  }
  const ticketId = ticketData.data.id;
  console.log(`Ticket created successfully! ID: ${ticketId}`);
  
  console.log('3. Waiting for 10 seconds for SLA worker to trigger escalation...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('4. Checking ticket escalation status...');
  res = await fetch(`${baseUrl}/tickets/${ticketId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const checkData = await res.json();
  
  if (checkData.success) {
    const t = checkData.data;
    console.log(`Ticket Status: ${t.status}`);
    console.log(`Escalation Level: ${t.escalation_level}`);
    if (t.escalation_level > 0) {
      console.log('✅ SUCCESS: Ticket was escalated correctly!');
    } else {
      console.log('❌ FAILED: Ticket was NOT escalated. SLA Worker might not be running or failed.');
    }
  } else {
    console.error('Failed to fetch ticket:', checkData);
  }
}

run().catch(console.error);
