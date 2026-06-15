// Using native fetch in Node 20

async function testPing() {
  try {
    const res = await fetch('http://localhost:5000/api/tracking/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ helper_id: 1, lat: 17.3, lng: 78.4 })
    });
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testPing();
