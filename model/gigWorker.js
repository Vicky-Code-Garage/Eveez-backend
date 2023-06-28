const mongoose = require('mongoose');

const gigWorkerSchema = new mongoose.Schema({
    worker_id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    vehicle_no: {
        type: String,
        default: null,
    },
    phoneNumber: {
        type: String,
        default: null,
    },
    organization: {
        type: String,
        default: null,
    },
    plan: {
        type: String,
        default: null,
    },
    rent: {
        type: Number,
        default: 0,
    },
    join_date: {
        type: String,
        default: null,
    },
    return_date: {
        type: String,
        default: null,
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
        default: 0,
    },
    status: {
        type: String,
        default: 'Deactive',
    },
});

const GigWorker = mongoose.model('GigWorker', gigWorkerSchema);

module.exports = GigWorker;
