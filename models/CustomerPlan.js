const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerPlanSchema = new Schema({
    planId: {
      type: String,
    },
    startDate: {
        type: Date, 
    },
    endDate: {
        type: Date,
    },
    type: {
        type: String, 
        enum:['PayAsYouGo', 'Package'],
    },
    isActive: {
        type: Boolean,
    },
    details: {
      name: {
        type: String,
      },
      price: {
        type: Number,
      },
      interviewsPerQuota: {
        type: Number,
      },
      amount:{
        type: Number
      },
      tax:{
        type: Number
      },
      interviewRate: {
        type: Number,
      },
      additionalInterviewRate: {
        type: Number,
      },
      interviewsUsed: {
        type: Number,
      },
      additionalInterviewsUsed: {
        type: Number,
      },
      quotaValidity: {
        type: String,
        enum: ['monthly', 'yearly'], 
      },
    },
    renewalDate: {
        type: Date,
    },
    isProRated: {
      type: Boolean
    }
});
  
module.exports = customerPlanSchema  
