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
        required: true,
    },
    phoneNumber: {
        type: Number,
        required: true,
    },
    organization: {
        type: String,
        required: true,
    },
    plan: {
        type: String,
        required: true,
    },
    rent: {
        type: Number,
        default: 0,
    },
    join_date: {
        type: String,
        required: true,
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
