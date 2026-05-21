// Native fetch is available in Node.js 18+

async function runTest() {
  const baseUrl = 'http://localhost:5001/api';

  console.log('1. Logging in as Admin (hi@gm.com / 1234)...');
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hi@gm.com', password: '1234' })
  });
  const adminData = await adminLoginRes.json();
  if (!adminData.success) {
    console.error('Admin login failed:', adminData);
    return;
  }
  const adminToken = adminData.data.token;
  console.log('Admin logged in successfully!');

  console.log('2. Logging in as Technician (technician@test.com / 1234)...');
  const techLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'technician@test.com', password: '1234' })
  });
  const techData = await techLoginRes.json();
  if (!techData.success) {
    console.error('Technician login failed:', techData);
    return;
  }
  const techToken = techData.data.token;
  const techId = techData.data.user.id;
  console.log('Technician logged in successfully! ID:', techId);

  console.log('3. Admin creating a new ticket assigned to Technician...');
  const createRes = await fetch(`${baseUrl}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Network Outage Test',
      description: 'Please fix the router',
      severity: 'High',
      category: 'General',
      priority: 2
    })
  });
  const ticketData = await createRes.json();
  if (!ticketData.success) {
    console.error('Ticket creation failed:', ticketData);
    return;
  }
  const ticketId = ticketData.data.id;
  console.log(`Ticket created! ID: ${ticketId}`);

  console.log('4. Admin assigning the ticket to the Technician...');
  const assignRes = await fetch(`${baseUrl}/tickets/${ticketId}/assign`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ assigned_to: techId })
  });
  const assignData = await assignRes.json();
  if (!assignData.success) {
    console.error('Assignment failed:', assignData);
    return;
  }
  console.log(`Ticket successfully assigned to Technician (ID: ${techId})!`);

  console.log('5. Technician updating status to "In-Progress"...');
  const inProgRes = await fetch(`${baseUrl}/tickets/${ticketId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`
    },
    body: JSON.stringify({ status: 'In-Progress' })
  });
  const inProgData = await inProgRes.json();
  if (!inProgData.success) {
    console.error('Status update to In-Progress failed:', inProgData);
    return;
  }
  console.log('Status successfully changed to In-Progress!');

  console.log('6. Technician adding a comment...');
  const commentRes = await fetch(`${baseUrl}/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`
    },
    body: JSON.stringify({ comment: 'Issue has been resolved.' })
  });
  const commentData = await commentRes.json();
  if (!commentData.success) {
    console.error('Adding comment failed:', commentData);
    return;
  }
  console.log('Comment successfully added!');

  console.log('7. Technician updating status to "Resolved"...');
  const resolveRes = await fetch(`${baseUrl}/tickets/${ticketId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`
    },
    body: JSON.stringify({ status: 'Resolved' })
  });
  const resolveData = await resolveRes.json();
  if (!resolveData.success) {
    console.error('Status update to Resolved failed:', resolveData);
    return;
  }
  console.log('Status successfully changed to Resolved!');

  console.log('✅ Full Admin -> Tech workflow test completed successfully!');
}

runTest().catch(console.error);
