const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/orders/2/cancel', {});
        console.log('Success:', res.data);
    } catch(err) {
        if (err.response) {
            console.error('Error status:', err.response.status);
            console.error('Error data:', err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}
test();
