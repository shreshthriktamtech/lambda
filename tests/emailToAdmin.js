
require('dotenv').config();
const { handler } = require('../index');

const mockEvent = {
    type: 'sendEmailToAdminIn6am12pm3pm6pm',
    organizationId: ''
};

async function emailToAdmin() {
    try {
        return await handler(mockEvent);
    } catch (error) {
        console.error('Error:', error);
    }
}

emailToAdmin();
