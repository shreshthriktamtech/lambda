const mongoose = require('mongoose');
const helper = require('../utils/helper')

const renewPlan = async (data) => {
    const { customerId } = data;
    let session;

    try {
        console.log(`Starting plan renewal process for customer ${customerId}`);

        session = await mongoose.startSession();
        session.startTransaction();
        console.log('Transaction started');

        const customer = await helper.findCustomerById(session, customerId);
        console.log('Customer fetched:', customer);

        if (!customer) {
            throw new Error('Customer not found');
        }

        const activePlan = await helper.findCurrentActivePlan(session, customerId);
        console.log('Current active plan fetched:', activePlan);
        if(!activePlan)
        {
            throw new Error('No active plan found');
        }

        if (customer?.changePlanRequest?.isActive) {
            console.log('Change plan request is active for customer', customerId);
            await helper.changePlan(session, customerId, activePlan);
            console.log('Plan changed for customer', customerId);
        } else if (activePlan.isProRated) {
            console.log('Active plan is prorated for customer', customerId);

            if (activePlan.type == 'Package') {
                console.log('Renewing prorated package plan for customer', customerId);
                await helper.renewProRatedPackagePlan(session, customerId, activePlan);
                console.log('Prorated package plan renewed for customer', customerId);
            } else if (activePlan.type == 'PayAsYouGo') {
                console.log('Renewing prorated pay-as-you-go plan for customer', customerId);
                await helper.renewProRatedPayAsYouGoPlan(session, customerId, activePlan);
                console.log('Prorated pay-as-you-go plan renewed for customer', customerId);
            }
        } else if (activePlan.type == 'PayAsYouGo') {
            console.log('Renewing pay-as-you-go plan for customer', customerId);
            await helper.billGeneration(session, customerId);
            console.log('Pay-as-you-go plan renewed for customer', customerId);
        } else if (activePlan.type == 'Package') {
            console.log('Renewing package plan for customer', customerId);
            await helper.renewPackagePlan(session, customerId, activePlan);
            console.log('Package plan renewed for customer', customerId);
        }

        await session.commitTransaction();
        session.endSession();
        console.log(`Transaction committed and session ended. Plan renewed for customer ${customerId}`);
    } catch (error) {
        if (session) {
            console.log('Aborting transaction due to error');
            await session.abortTransaction();
            session.endSession();
            console.log('Transaction aborted and session ended');
        }
        console.error(`Error in renewing the plan for customer ${customerId}: ${error.message}`);
        throw new Error(error.message);
    }
};

module.exports = {
    renewPlan
}