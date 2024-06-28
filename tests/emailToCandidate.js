require('dotenv').config();
const { handler } = require('../index');

const mockEvent = {
    type: 'sendReminderEmailBefore6And1Hours',
};

async function emailToCandidate() {
    try {
        return await handler(mockEvent);
    } catch (error) {
        console.error('Error:', error);
    }
}

emailToCandidate();
