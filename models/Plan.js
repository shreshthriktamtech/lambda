const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const planSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type:{
        type: String,
        required: true,
        enum: ['Package', 'PayAsYouGo']
    },
    price: { 
        type: Number,   
    },
    quotaValidity: { 
        type: String, 
        enum: ['monthly', 'yearly'], 
    },
    interviewsPerQuota: { 
        type: Number
    },
    interviewRate: { 
        type: Number
    },
    additionalInterviewRate: { 
        type: Number
    },
    isActive: { 
        type: Boolean, 
        required: true,
        default: true
    },
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan