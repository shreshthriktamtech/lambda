const { default: mongoose } = require("mongoose");
const { renewPlan } = require("../services/planService");
const Customer = require("../models/Customer");

const renewPlanLambda = async (event)=>{
    try {
        console.log('Lambda function starts');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        console.log(`Running for renewalDate between ${startOfToday} to ${endOfToday}`);

        const customers = await Customer.find({
            'pricingPlans.isActive': true,
            'pricingPlans.renewalDate': {
                $gte: startOfToday,
                $lt: endOfToday
            }
        });

        console.log(`Processing renewal for ${customers.length} customers`);
        for (const customer of customers) {
            await renewPlan({customerId: customer._id});
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