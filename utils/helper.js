const Plan = require('../models/Plan');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const { descriptions } = require('./constants');
const organizationModel = require('../models/organizationModel');


// find plan buy id
const findPlanById = async (session, planId) => {
    try {
        return await Plan.findById(planId).session(session);
    } catch (error) {
        console.error('Error finding plan:', error);
        throw new Error('Error finding plan');
    }
};

const findOrganizationById = async (session, organizationId) => {
    try {
        return await organizationModel.findById(organizationId).session(session);
    } catch (error) {
        console.error('Error finding organization', error);
        throw new Error('Error finding organization');
    }
};

const findCurrentActivePlan = async(session, organizationId)=>{
    try {
        const organizationPlan = await organizationModel.findOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            { 'pricingPlans.$': 1 },
            { session }
        );

        if (organizationPlan && organizationPlan.pricingPlans.length > 0) {
            return organizationPlan.pricingPlans[0];
        } else {
            return null;
        }
    } catch (error) {
        throw error;
    }
}

const renewPackagePlan = async (session, organizationId, activePlan) => {
    try {
        console.log(`Renewing package plan for organization: ${organizationId}, plan: ${activePlan.planId}`);

        const organization = await findOrganizationById(session, organizationId);
        if (!organization) {
            throw new Error('organization not found');
        }
        console.log(`organization found: ${organization._id}`);

        const plan = await findPlanById(session, activePlan.planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        console.log(`Plan found: ${plan._id}`);

        const currentDate = new Date();
        const renewalDate = new Date(activePlan.renewalDate);

        if (renewalDate > currentDate) {
            throw new Error('Renewal date is in the future, plan cannot be renewed yet');
        }

        const newRenewalDate = calculateRenewalDate(renewalDate, activePlan.details.quotaValidity);
        console.log(`New renewal date calculated: ${newRenewalDate}`);


        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.details.interviewsUsed': 0,
                    'pricingPlans.$.details.additionalInterviewsUsed': 0,
                    'pricingPlans.$.details.interviewsPerQuota': plan.interviewsPerQuota,
                    'pricingPlans.$.details.additionalInterviewRate': plan.additionalInterviewRate,
                    'pricingPlans.$.renewalDate': newRenewalDate
                }
            },
            { session },
        );
        console.log(`organization plan updated for organization: ${organizationId}`);

        if (organization.paymentType == 'postpaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for postpaid organization: ${organizationId}`);
        }

        let note = `Package Renewal of ${plan.name}`;
        note = `${getNotes('PackageRenewal')} ${plan.name}`;
        await handleTransactionPayment(session, organizationId, plan.price, 'PackageRenewal', note);
        console.log(`Transaction payment handled for organization: ${organizationId}, plan: ${plan.name}`);

        if (organization.paymentType == 'prepaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for prepaid organization: ${organizationId}`);
        }
    } catch (error) {
        console.log(`Error renewing package plan for organization: ${organizationId} - ${error.message}`);
        throw new Error(error.message);
    }
};

const renewProRatedPackagePlan = async (session, organizationId, activePlan) => {
    try {
        console.log(`Renewing pro-rated package plan for organization: ${organizationId}, plan: ${activePlan.planId}`);

        const organization = await findOrganizationById(session, organizationId);
        if (!organization) {
            throw new Error('organization not found');
        }
        console.log(`organization found: ${organization._id}`);

        const plan = await findPlanById(session, activePlan.planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        console.log(`Plan found: ${plan._id}`);

        const date = new Date();

        if (organization.paymentType == 'postpaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for postpaid organization: ${organizationId}`);
        }

        let note = `Package Renewal of ${plan.name}`;
        note = `${getNotes('PackageRenewal')} ${plan.name}`;
        await handleTransactionPayment(session, organizationId, plan.price, 'PackageRenewal', note);
        console.log(`Transaction payment handled for organization: ${organizationId}, plan: ${plan.name}`);

        if (organization.paymentType == 'prepaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for prepaid organization: ${organizationId}`);
        }

        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.isActive': false,
                    'pricingPlans.$.endDate': new Date(),
                }
            },
            { session }
        );
        console.log(`organization plan deactivated for organization: ${organizationId}`);

        const renewalDate = calculateRenewalDate(date, plan.quotaValidity);
        await createNewPackagePlan(session, organizationId, plan, renewalDate, false);
        console.log(`New package plan created for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error renewing pro-rated package plan for organization: ${organizationId} - ${error.message}`);
        throw new Error('Error in renew a proRated Package Plan');
    }
};

const renewProRatedPayAsYouGoPlan = async (session, organizationId, activePlan) => {
    try {
        console.log(`Renewing pro-rated pay-as-you-go plan for organization: ${organizationId}, plan: ${activePlan.planId}`);

        const organization = await findOrganizationById(session, organizationId);
        if (!organization) {
            throw new Error('organization not found');
        }
        console.log(`organization found: ${organization._id}`);

        const plan = await findPlanById(session, activePlan.planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        console.log(`Plan found: ${plan._id}`);

        const date = new Date();
        await billGeneration(session, organizationId);
        console.log(`Bill generated for organization: ${organizationId}`);

        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.isActive': false,
                    'pricingPlans.$.endDate': new Date(),
                }
            },
            { session }
        );
        console.log(`organization plan deactivated for organization: ${organizationId}`);

        const renewalDate = calculateRenewalDate(date, "monthly");
        await createNewPayAsYouGoPlan(session, organizationId, plan, renewalDate, false);
        console.log(`New pay-as-you-go plan created for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error renewing pay-as-you-go plan for organization: ${organizationId} - ${error.message}`);
        throw new Error('Error in renewing the payAsYouGo plan');
    }
};

const changePlan = async (session, organizationId, currentPlan) => {
    try {
        console.log(`Changing plan for organization: ${organizationId}, current plan: ${currentPlan.planId}`);

        const organization = await findOrganizationById(session, organizationId);
        if (!organization) {
            throw new Error('organization not found');
        }
        console.log(`organization found: ${organization._id}`);

        const plan = await findPlanById(session, currentPlan.planId);
        const changePlan = await findPlanById(session, organization.changePlanRequest.planId);
        if (!plan || !changePlan) {
            throw new Error('Plan not found');
        }
        console.log(`Current plan and change plan found: ${plan._id}, ${changePlan._id}`);

        if (currentPlan.type == 'Package') {
            const currentDate = new Date();
            const renewalDate = new Date(currentPlan.renewalDate);

            if (renewalDate > currentDate) {
                throw new Error("Renewal date is in the future, plan cannot be renewed yet");
            }
            if (changePlan.type == 'Package') {
                await changePlanFromPackageToPackage(session, organization, plan, changePlan);
            }
            if (changePlan.type == 'PayAsYouGo') {
                await changePlanFromPackageToPayAsYouGo(session, organization, plan, changePlan);
            }
        }
        if (currentPlan.type == 'PayAsYouGo') {
            if (changePlan.type == 'Package') {
                await changePlanFromPayAsYouGoToPackage(session, organization, currentPlan, changePlan);
            }
        }
        console.log(`Plan changed successfully for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error changing plan for organization: ${organizationId} - ${error.message}`);
        throw new Error('Something went wrong here');
    }
};

const changePlanFromPackageToPackage = async (session, organization, currentPlan, changePlan) => {
    try {
        console.log(`Changing plan from package to package for organization: ${organization._id}`);

        const organizationId = organization._id;
        if (organization.paymentType == 'postpaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for postpaid organization: ${organizationId}`);
        }

        let note = `${getNotes('ChangePlan')} ${changePlan.name}`;
        await handleTransactionPayment(session, organizationId, changePlan.price, 'ChangePlan', note);
        console.log(`Transaction payment handled for organization: ${organizationId}, change plan: ${changePlan.name}`);

        if (organization.paymentType == 'prepaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for prepaid organization: ${organizationId}`);
        }

        const date = new Date();
        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.isActive': false,
                    'pricingPlans.$.endDate': new Date(),
                }
            },
            { session }
        );
        console.log(`organization plan deactivated for organization: ${organizationId}`);

        const renewalDate = calculateRenewalDate(date, changePlan.quotaValidity);
        await createNewPackagePlan(session, organizationId, changePlan, renewalDate, false);
        console.log(`New package plan created for organization: ${organizationId}`);

        await organizationModel.updateOne(
            { _id: organizationId, 'changePlanRequest.isActive': true },
            { $set: { 'changePlanRequest.isActive': false } },
            { session }
        );
        console.log(`Change plan request deactivated for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error changing package to package for organization: ${organization._id} - ${error.message}`);
        throw new Error('In change Package');
    }
};

const changePlanFromPackageToPayAsYouGo = async (session, organization, currentPlan, changePlan) => {
    try {
        console.log(`Changing plan from package to pay-as-you-go for organization: ${organization._id}`);

        const organizationId = organization._id;
        await billGeneration(session, organizationId);
        console.log(`Bill generated for organization: ${organizationId}`);

        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.isActive': false,
                    'pricingPlans.$.endDate': new Date(),
                }
            },
            { session }
        );
        console.log(`organization plan deactivated for organization: ${organizationId}`);

        const date = new Date();
        const renewalDate = calculateRenewalDate(date, "monthly");
        await createNewPayAsYouGoPlan(session, organizationId, changePlan, renewalDate, false);
        console.log(`New pay-as-you-go plan created for organization: ${organizationId}`);

        await organizationModel.updateOne(
            { _id: organizationId, 'changePlanRequest.isActive': true },
            { $set: { 'changePlanRequest.isActive': false } },
            { session }
        );
        console.log(`Change plan request deactivated for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error changing package to pay-as-you-go for organization: ${organization._id} - ${error.message}`);
        throw new Error('Error in changePlanFromPackageToPayAsYouGo');
    }
};

const changePlanFromPayAsYouGoToPackage = async (session, organization, currentPlan, changePlan) => {
    try {
        console.log(`Changing plan from pay-as-you-go to package for organization: ${organization._id}`);

        const organizationId = organization._id;
        if (organization.paymentType == 'postpaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for postpaid organization: ${organizationId}`);
        }

        let note = `${getNotes('ChangePlan')} ${changePlan.name}`;
        await handleTransactionPayment(session, organizationId, changePlan.price, 'ChangePlan', note);
        console.log(`Transaction payment handled for organization: ${organizationId}, change plan: ${changePlan.name}`);

        if (organization.paymentType == 'prepaid') {
            await billGeneration(session, organizationId);
            console.log(`Bill generated for prepaid organization: ${organizationId}`);
        }

        const date = new Date();
        await organizationModel.updateOne(
            { _id: organizationId, 'pricingPlans.isActive': true },
            {
                $set: {
                    'pricingPlans.$.isActive': false,
                    'pricingPlans.$.endDate': new Date(),
                }
            },
            { session }
        );
        console.log(`organization plan deactivated for organization: ${organizationId}`);

        const renewalDate = calculateRenewalDate(date, changePlan.quotaValidity);
        await createNewPackagePlan(session, organizationId, changePlan, renewalDate, false);
        console.log(`New package plan created for organization: ${organizationId}`);

        await organizationModel.updateOne(
            { _id: organizationId, 'changePlanRequest.isActive': true },
            { $set: { 'changePlanRequest.isActive': false } },
            { session }
        );
        console.log(`Change plan request deactivated for organization: ${organizationId}`);
    } catch (error) {
        console.log(`Error changing pay-as-you-go to package for organization: ${organization._id} - ${error.message}`);
        throw new Error(`Error changing pay-as-you-go to package for organization: ${organization._id} - ${error.message}`);
    }
};

const handleTransactionPayment = async (session, organizationId, amount, transactionType, note) => {
    try {
        console.log(`Handling payment for organization ID: ${organizationId} at price: ${amount}`);

        // Fetch the organization details from the database
        const organization = await organizationModel.findById(organizationId).session(session);
        if (!organization) {
            console.log('organization not found during payment processing');
            throw new Error('organization Not Found');
        }

        // Calculate the tax and total amount for the transaction
        const taxRate = organization.tax;
        const price = parseInt(amount);
        const taxAmount = Math.ceil((price * taxRate) / 100);
        const totalAmount = price + taxAmount;

        // Initialize balance variables
        let currentBalance = organization.currentBalance;
        let beforeUpdateCurrentBalance = currentBalance;
        let afterUpdateCurrentBalance;

        console.log(`Current balance before transaction: ${currentBalance}`);

        // Default transaction status
        let status = 'unbilled';

        // Case 1: organization's current balance is sufficient to cover the total amount
        if (currentBalance >= totalAmount) {
            currentBalance -= totalAmount;
            afterUpdateCurrentBalance = currentBalance;
            status = 'completed';

            // Create a transaction with status 'completed'
            await createTransaction(
                session,
                organizationId,
                transactionType,
                status,
                {
                    price: price,
                    tax: taxRate,
                    calculatedTax: taxAmount,
                    amount: totalAmount,
                    note
                },
                beforeUpdateCurrentBalance,
                afterUpdateCurrentBalance,
                'debit'
            );

        // Case 2: organization's current balance is partially sufficient
        } else if (currentBalance > 0) {
            // Calculate the amount still due after using the current balance
            let remainingAmountDue = totalAmount - currentBalance;

            // Calculate the net price and tax covered by the current balance
            let netPriceCoveredByBalance = Math.ceil(currentBalance / (1 + taxRate / 100));
            let taxCoveredByBalance = currentBalance - netPriceCoveredByBalance;

            // Create a transaction for the portion covered by the current balance
            await createTransaction(
                session,
                organizationId,
                transactionType,
                'completed',
                {
                    price: netPriceCoveredByBalance,
                    tax: taxRate,
                    calculatedTax: taxCoveredByBalance,
                    amount: currentBalance,
                    note
                },
                beforeUpdateCurrentBalance,
                0,
                'debit'
            );

            // Update the balances for the next transaction
            beforeUpdateCurrentBalance = 0;
            afterUpdateCurrentBalance = -remainingAmountDue;

            // Calculate the remaining net price and tax to be billed
            let netPriceRemaining = Math.ceil(remainingAmountDue / (1 + taxRate / 100));
            let taxRemaining = remainingAmountDue - netPriceRemaining;

            // Create a transaction for the remaining amount to be billed
            await createTransaction(
                session,
                organizationId,
                transactionType,
                'unbilled',
                {
                    price: netPriceRemaining,
                    tax: taxRate,
                    calculatedTax: taxRemaining,
                    amount: remainingAmountDue,
                    note
                },
                0,
                afterUpdateCurrentBalance,
                'debit'
            );

        // Case 3: organization's current balance is insufficient to cover any part of the total amount
        } else {
            afterUpdateCurrentBalance = currentBalance - totalAmount;

            // Create a transaction with status 'unbilled'
            await createTransaction(
                session,
                organizationId,
                transactionType,
                'unbilled',
                {
                    price: price,
                    tax: taxRate,
                    calculatedTax: taxAmount,
                    amount: totalAmount,
                    note
                },
                beforeUpdateCurrentBalance,
                afterUpdateCurrentBalance,
                'debit'
            );
        }

        // Update the organization's current balance in the database
        await organizationModel.findByIdAndUpdate(organizationId, {
            $set: { currentBalance: afterUpdateCurrentBalance }
        }, { new: true, session });

        // Log the updated balance
        console.log(`Updated current balance after transaction: ${afterUpdateCurrentBalance}`);

    } catch (error) {
        console.error(`Error processing transaction: ${error.message}`);
        throw new Error(`Error processing transaction: ${error.message}`);
    }
};

const createTransaction = async (session, organizationId, type, status, details, beforeUpdateCurrentBalance, afterUpdateCurrentBalance, transactionType) => {
    try {
        const date = new Date();
        const transaction = new Transaction({
            organizationId: organizationId,
            type: type,
            date: date,
            status: status,
            details: details,
            beforeUpdateCurrentBalance: beforeUpdateCurrentBalance || 0,
            afterUpdateCurrentBalance: afterUpdateCurrentBalance || 0,
            transactionType: transactionType,
        });

        await transaction.save({ session });
        console.log(`Transaction created with ID: ${transaction._id}`);
        return transaction;
    } catch (error) {
        console.error("Error while creating the transaction:", error.message);
        throw error;
    }
};

const billGeneration = async (session, organizationId) => {   
    try {
        console.log(`Starting bill generation for organization ID: ${organizationId}`);

        const organization = await findOrganizationById(session, organizationId);
        if (!organization) {
            console.error(`organization not found for ID: ${organizationId}`);
            throw new Error('organization not found');
        }

        let criteria = {
            organizationId: organizationId,
            status: 'unbilled'
        };

        const transactions = await Transaction.find(criteria).session(session);
        console.log(`Found ${transactions.length} unbilled transactions for organization ID: ${organizationId}`);

        if (transactions.length > 0) {
            const totalAmount = transactions.reduce((acc, transaction) => acc + (transaction.details.amount || 0), 0);
            const totalPrice = transactions.reduce((acc, transaction) => acc + (transaction.details.price || 0), 0);
            const totalTax = transactions.reduce((acc, transaction) => acc + (transaction.details.calculatedTax || 0), 0);

            const lineItems = transactions.map(transaction => ({
                description: transaction.type,
                amount: transaction.details.price
            }));

            lineItems.push({
                description: 'Tax (18%)',
                amount: totalTax,
            });

            const invoiceData = {
                organizationId: organizationId,
                totalAmount,
                totalPrice,
                totalTax,
                lineItems
            };

            await createInvoice(session, invoiceData);
            console.log(`Invoice created for organization ID: ${organizationId} with total amount: ${totalAmount}`);
            await billTransactions(session, criteria);
            const data = {
                organizationId,
                amount: totalAmount
            };
            await updateOutstandingBalance(session, data);
            console.log(`Updated outstanding balance for organization ID: ${organizationId} by amount: ${totalAmount}`);
        }
    } catch (error) {
        console.error(`Error generating invoice: ${error.message}`);
        throw new Error(`Error generating invoice: ${error.message}`);
    }
};

const calculateRenewalDate = (startDate, quotaValidity) => {
    console.log(`Calculating renewal date from start date: ${startDate} with quota validity: ${quotaValidity}`);
    const renewalDate = new Date(startDate);
    if (quotaValidity === 'monthly') {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
    } else if (quotaValidity === 'yearly') {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    }
    console.log(`Calculated renewal date: ${renewalDate}`);
    return renewalDate;
};

const createNewPackagePlan = async (session, organizationId, plan, renewalDate, isProRated) => {
    try {
        console.log(`Creating new package plan for organization ID: ${organizationId} with plan ID: ${plan._id}`);
        const organization = await organizationModel.findById(organizationId).session(session);
        const date = new Date();
        const neworganizationPlan = {
            planId: plan._id,
            startDate: date,
            endDate: null,
            type: 'Package',
            isActive: true,
            details: {
                name: plan.name,
                price: plan.price,
                interviewsPerQuota: plan.interviewsPerQuota,
                interviewRate: plan.interviewRate,
                additionalInterviewRate: plan.additionalInterviewRate,
                interviewsUsed: 0,
                quotaValidity: plan.quotaValidity,
                additionalInterviewsUsed: 0
            },
            renewalDate,
            isProRated
        };
        console.log(`New package plan details: ${JSON.stringify(neworganizationPlan)}`);

        organization.pricingPlans.push(neworganizationPlan);
        await organization.save({ session });
        console.log(`Package plan saved for organization ID: ${organizationId}`);
    } catch (error) {
        console.error(`Error creating package plan for organization ID: ${organizationId}: ${error.message}`);
        throw new Error('Error in creating the Package');
    }
};

const createNewPayAsYouGoPlan = async (session, organizationId, plan, renewalDate) => {
    try {
        console.log(`Creating new PayAsYouGo plan for organization ID: ${organizationId} with plan ID: ${plan._id}`);
        const organization = await organizationModel.findById(organizationId).session(session);
        const date = new Date(); 
        const neworganizationPlan = {
            planId: plan._id,
            startDate: date,
            endDate: null,
            type: 'PayAsYouGo',
            isActive: true,
            details: {
                name: plan.name,
                interviewRate: organization.interviewRate || plan.interviewRate,
            },
            renewalDate,
        };

        organization.pricingPlans.push(neworganizationPlan);
        await organization.save({ session });
        console.log(`PayAsYouGo plan saved for organization ID: ${organizationId}`);
    } catch (error) {
        console.error(`Error creating PayAsYouGo plan for organization ID: ${organizationId}: ${error.message}`);
        throw new Error('Error while creating the PayAsYouGo');
    }
};

const billTransactions = async (session, data) => {
    try {
        const { organizationId, status } = data;
        console.log(`Billing transactions for organization ID: ${organizationId} with status: ${status}`);
        await Transaction.updateMany(
            { organizationId, status }, 
            { $set: { status: 'billed' }},
            { session }
        );
        console.log(`Transactions updated to billed for organization ID: ${organizationId}`);
    } catch (error) {
        console.error(`Error in function billTransactions in file ${__filename}: ${error.message}`);
        throw new Error('Something went wrong updating transactions');
    }
};

const updateOutstandingBalance = async (session, data) => {
    try {
        const { organizationId, amount } = data;
        console.log(`Updating outstanding balance for organization ID: ${organizationId} by amount: ${amount}`);
        await organizationModel.updateOne(
            { _id: organizationId },
            { $inc: { outstandingBalance: amount } },
            { session }
        );
        console.log(`Outstanding balance updated for organization ID: ${organizationId}`);
    } catch (error) {
        console.error(`Error updating outstanding balance for organization ID: ${organizationId}: ${error.message}`);
        throw new Error('Unable to update the outstanding balance');
    }
};

const createInvoice = async (session, data) => {
    try {
        console.log(`Creating invoice for organization ID: ${data.organizationId} with total amount: ${data.totalAmount}`);
        const newInvoice = new Invoice({
            organizationId: data.organizationId,
            issuedDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            totalAmount: data.totalAmount,
            totalPrice: data.totalPrice,
            totalTax: data.totalTax,
            currency: 'INR',
            status: data.status || 'unpaid',
            lineItems: data.lineItems
        });

        await newInvoice.save({ session });
        console.log(`Invoice created with ID: ${newInvoice._id}`);
    } catch (error) {
        console.error(`Error in function createInvoice in file ${__filename}: ${error.message}`);
        throw new Error('Something went wrong while creating invoice');
    }
};

const getNotes = (transactionType) => {
    return descriptions[transactionType] || "";
};

module.exports = {
    createTransaction,
    findCurrentActivePlan,
    changePlan,
    renewPackagePlan,
    billGeneration,
    billTransactions,
    renewProRatedPayAsYouGoPlan,
    renewProRatedPackagePlan,
    findOrganizationById
}
