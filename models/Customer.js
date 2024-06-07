const mongoose = require('mongoose');
const customerPlanSchema = require('./CustomerPlan');
const Schema = mongoose.Schema;

const customerSchema = new Schema({
  name: {
    type: String, 
    required: true
  },
  email: {
    type: String, 
    required: true
  },
  contactInformation: {
    phone: {
        type: String
    },
    secondaryEmail: {
        type: String
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  region: {
    type: String
  },
  currency: {
    type: String, 
    default: "INR"
  },
  paymentType:{
    type: String,
    enum: ['Prepaid', 'Postpaid'],
    default: 'Prepaid'
  },
  tax: {
    type: Number,
    default: 18
  },
  currentBalance: {
    type: Number, 
    default: 0
  },
  outstandingBalance: {
    type: Number, 
    default: 0
  },
  canOveruseInterviews: {
    type: Boolean, 
    default: false
  },
  pricingPlans: [{
    type: customerPlanSchema
  }],
  interviewRate: {
    type: Number,
    default: 0
  },
  changePlanRequest: {
    isActive: {
      type: Boolean,
    },
    planId: {
      type: String,
    },
    requestedDate: {
      type: Date,
    },
  },
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer