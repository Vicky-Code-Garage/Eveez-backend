const mongoose = require('mongoose');

const gigWorkerSchema = new mongoose.Schema({
    worker_id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    weeklyPayments: [{
        razorpay_orderid: {
            type: String,
        },
        razorpay_paymentid: {
            type: String,
        },
        razorpay_signature: {
            type: String,
        },
        amount: {
            type: Number,
        },
        day: {
            type: Number,
        },
        month: {
            type: Number,
        },
        year: {
            type: Number,
        },
        installment: {
            type: Number,
        }
    }],
    weeklyAmountToPay: {
        type: Number,
        required: true,
    },
    active: {
        type: Boolean,
        default: false,
    },
});

const GigWorker = mongoose.model('GigWorker', gigWorkerSchema);

module.exports = GigWorker;
