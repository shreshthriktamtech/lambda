const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const invoiceSchema = new Schema({
    customerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Customer' 
    },
    issuedDate: {
      type: Date
    },
    dueDate: {
      type: Date
    },
    totalAmount: {
      type: Number
    },
    totalTax: {
      type: Number
    },
    totalPrice: {
      type: Number
    },
    currency: {
      type: String
    },
    status: {
      type: String, 
      enum:['unpaid', 'paid'],
      default: 'unpaid'
    },
    lineItems: [{
      description: String,
      amount: Number,
      serviceId: String,
      ratePerAdditionalInterview: Number,
      quantity: Number,
      lineTotal: Number
    }],
  }, {timestamps: true});
  
const Invoice = mongoose.model('Invoice', invoiceSchema);
  
module.exports = Invoice