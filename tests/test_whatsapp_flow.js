// Using native fetch in Node 20

// Helper to simulate WhatsApp Webhook Payload
function createWAPayload(from, msg) {
    return {
        object: "whatsapp_business_account",
        entry: [{
            changes: [{
                value: {
                    messages: [{ ...msg, from }]
                },
                field: "messages"
            }]
        }]
    };
}

async function runTest() {
    const from = "919000000000";
    console.log("--- STARTING WHATSAPP BOT TEST ---");

    // 1. Send "hi"
    console.log("\nStep 1: User says 'hi'");
    await fetch('http://localhost:5000/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createWAPayload(from, { type: 'text', text: { body: 'hi' } }))
    });

    // 2. Mock Selection
    console.log("\nStep 2: User selects 'Grocery 🛒'");
    await fetch('http://localhost:5000/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createWAPayload(from, { 
            type: 'interactive', 
            interactive: { type: 'list_reply', list_reply: { id: 'task_grocery' } } 
        }))
    });

    // 3. Send Details
    console.log("\nStep 3: User sends items list");
    await fetch('http://localhost:5000/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createWAPayload(from, { type: 'text', text: { body: '1kg Onion, 2kg Potato' } }))
    });

    // 4. Send Location
    console.log("\nStep 4: User sends location");
    await fetch('http://localhost:5000/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createWAPayload(from, { type: 'text', text: { body: 'My Home Address' } }))
    });

    // 5. Confirm Order
    console.log("\nStep 5: User confirms order");
    await fetch('http://localhost:5000/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createWAPayload(from, { 
            type: 'interactive', 
            interactive: { type: 'button_reply', button_reply: { id: 'confirm_order' } } 
        }))
    });

    console.log("\n--- TEST COMPLETE ---");
    console.log("Please check 'backend/out.log' for bot responses and verify DB for new order.");
}

runTest();
