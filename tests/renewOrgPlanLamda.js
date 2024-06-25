require('dotenv').config();

const { handler } = require('../index');

const mockEvent = {
    type: 'renew-org-plan',
    organizationId: '66796cd748512b8acb076157'
};


async function testRenewOrgPlanLambdaHandler() {
    try {
        return await handler(mockEvent);
    } catch (error) {
        console.error('Error:', error);
    }
}

testRenewOrgPlanLambdaHandler();
