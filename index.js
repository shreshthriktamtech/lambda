const { renewOrgPlan } = require('./lambda/renewOrgPlan');
const { renewPlanLambda } = require('./lambda/renewPlanLambda');

exports.handler = async (event) => {
    try
    {
        if(event.type=='renew-plan')
        {
            return await renewPlanLambda(event)   
        }

        if(event.type=='renew-org-plan')
        {
            return await renewOrgPlan(event)   
        }
        else
        {
            console.log(`Not a valid Event Type`)
            const response = {
                statusCode: 500,
                body: JSON.stringify(`Not a valid Event Type`),
            };
            return response;
        }
    }
    catch(error)
    {
        console.log(`Something went wrong in calling the lambda`);
        console.log(error.message);
    }

};
