
require('dotenv').config();
const { handler } = require('../index');

const mockEvent = {
    type: 'demo',
};

async function emailToAdmin() {
    try {
        return await handler(mockEvent);
    } catch (error) {
        console.error('Error:', error);
    }
}

emailToAdmin();
