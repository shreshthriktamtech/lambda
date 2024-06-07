const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const paymentSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    invoiceId: {type: Schema.Types.ObjectId, ref: 'Invoice'},
    date: Date,
    amount: Number,
    currency: String,
    method: String,
    paymentDetails: {
        cardLastFour: String,
        paymentProcessor: String
    },
    status: String,
  }, {timestamps: true});
  
const Payment = mongoose.model('Payment', paymentSchema);
  
module.exports = Payment
