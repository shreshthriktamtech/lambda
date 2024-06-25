const { default: mongoose } = require("mongoose");
const { renewPlan } = require("../services/planService");
const organizationModel = require("../models/organizationModel");

const renewOrgPlan = async (event) => {
    try {
        console.log('Lambda function starts');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        console.log(`Running for renewalDate between ${startOfToday} to ${endOfToday}`);

        const organization = await organizationModel.findOne({
            _id: event.organizationId,
            'pricingPlans.isActive': true,
            'pricingPlans.renewalDate': {
                $gte: startOfToday,
                $lt: endOfToday
            }
        });

        if (!organization) {
            console.log(`No organization found with ID ${event.organizationId} that needs renewal`);
            await mongoose.connection.close();
            return {
                statusCode: 404,
                body: JSON.stringify(`No renewal tasks needed for ${startOfToday.toDateString()}`),
            };
        }

        console.log(`Processing renewal for organization ID: ${organization._id}`);
        await renewPlan({ organizationId: organization._id });

        await mongoose.connection.close();

        const response = {
            statusCode: 200,
            body: JSON.stringify(`Renewal tasks completed for ${startOfToday.toDateString()}`),
        };
        return response;
    } catch (error) {
        const startOfToday = new Date();
        console.error(`Error in Lambda function: ${error.message}`);
        const response = {
            statusCode: 500,
            body: JSON.stringify(`Oops! Something went wrong in renewal for ${startOfToday.toDateString()}`),
        };
        return response;
    }
};

module.exports = {
    renewOrgPlan
};
