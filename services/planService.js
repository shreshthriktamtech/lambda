const mongoose = require('mongoose');
const helper = require('../utils/helper')

const renewPlan = async (data) => {
    const { organizationId } = data;
    let session;

    try {
        console.log(`Starting plan renewal process for organization ${organizationId}`);

        session = await mongoose.startSession();
        session.startTransaction();
        console.log('Transaction started');

        const organization = await helper.findOrganizationById(session, organizationId);
        console.log('Organization fetched:', organization);

        if (!organization) {
            throw new Error('organization not found');
        }

        const activePlan = await helper.findCurrentActivePlan(session, organizationId);
        console.log('Current active plan fetched:', activePlan);
        if(!activePlan)
        {
            throw new Error('No active plan found');
        }

        if (organization?.changePlanRequest?.isActive) {
            console.log('Change plan request is active for organization', organizationId);
            await helper.changePlan(session, organizationId, activePlan);
            console.log('Plan changed for organization', organizationId);
        } else if (activePlan.isProRated) {
            console.log('Active plan is prorated for organization', organizationId);

            if (activePlan.type == 'Package') {
                console.log('Renewing prorated package plan for organization', organizationId);
                await helper.renewProRatedPackagePlan(session, organizationId, activePlan);
                console.log('Prorated package plan renewed for organization', organizationId);
            } else if (activePlan.type == 'PayAsYouGo') {
                console.log('Renewing prorated pay-as-you-go plan for organization', organizationId);
                await helper.renewProRatedPayAsYouGoPlan(session, organizationId, activePlan);
                console.log('Prorated pay-as-you-go plan renewed for organization', organizationId);
            }
        } else if (activePlan.type == 'PayAsYouGo') {
            console.log('Renewing pay-as-you-go plan for organization', organizationId);
            await helper.billGeneration(session, organizationId);
            console.log('Pay-as-you-go plan renewed for organization', organizationId);
        } else if (activePlan.type == 'Package') {
            console.log('Renewing package plan for organization', organizationId);
            await helper.renewPackagePlan(session, organizationId, activePlan);
            console.log('Package plan renewed for organization', organizationId);
        }

        await session.commitTransaction();
        session.endSession();
        console.log(`Transaction committed and session ended. Plan renewed for organization ${organizationId}`);
    } catch (error) {
        if (session) {
            console.log('Aborting transaction due to error');
            await session.abortTransaction();
            session.endSession();
            console.log('Transaction aborted and session ended');
        }
        console.error(`Error in renewing the plan for organization ${organizationId}: ${error.message}`);
        throw new Error(error.message);
    }
};

module.exports = {
    renewPlan
}