const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    customerId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Customer' 
    },
    billingCycle: {
        type: String,
    },
    date: {
        type: Date, 
        required: true
    },
    transactionType: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    type: {
        type: String,
        enum: [
          'AssignPackage',
          'AssignPayAsYouGo',
          'InterviewCharge',
          'AdditionalInterviewCharge',
          'PackageRenewal',
          'ChangePlan',
          'ChangeBillingCycle',
          'BillPaid',
          'Bonus',
          'TopUp'
        ]
    },
    status: {
        type: String, 
        enum: ['unbilled', 'billed', 'completed', 'promo_credit']
    },
    details: {
      name: {
        type: String,
      },
      price: {
        type: Number
      },
      amount: {
        type: Number,
      },
      tax:{
        type: Number
      },
      calculatedTax:{
        type: Number
      },
      interviewsIncluded: {
        type: Number,
      },
      renewalDate: {
        type: Date
      },
      serviceId: {
        type: String
      },
      quotaValidity: { 
        type: String, 
        enum: ['monthly', 'yearly'], 
      },
      note:{
        type: String
      }
    },
    beforeUpdateCurrentBalance  : {type: Number, default: 0},
    afterUpdateCurrentBalance: {type: Number, default: 0},
    
}, { timestamps: true });
  
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction
