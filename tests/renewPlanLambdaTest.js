require('dotenv').config();

const { handler } = require('../index');

const mockEvent = {
    type: 'renew-plan',
};


async function testRenewPlanLambdaHandler() {
    try {
        return await handler(mockEvent);
    } catch (error) {
        console.error('Error:', error);
    }
}
testRenewPlanLambdaHandler();
