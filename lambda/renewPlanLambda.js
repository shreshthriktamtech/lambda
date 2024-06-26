const { default: mongoose } = require("mongoose");
const { renewPlan } = require("../services/planService");
const organizationModel = require("../models/organizationModel");

const renewPlanLambda = async (event) => {
    try {
        console.log('Lambda function starts');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        console.log(`Running for renewalDate between ${startOfToday} to ${endOfToday}`);

        const organizations = await organizationModel.find({
            pricingPlans: {
                $elemMatch: {
                    isActive: true,
                    renewalDate: {
                        $gte: startOfToday,
                        $lt: endOfToday
                    }
                }
            }
        });

        console.log(`Processing renewal for ${organizations.length} organizations`);
        for (const organization of organizations) {
            try {
                await renewPlan({ organizationId: organization._id });
                console.log(`Successfully renewed plan for organization ID: ${organization._id}`);
            } catch (error) {
                console.error(`Failed to renew plan for organization ID: ${organization._id}, Error: ${error.message}`);
            }
        }

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
}

module.exports = {
    renewPlanLambda
}
