const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
    subscriber_id: {
        type: String,
    },
    zoho_id: {
        type: String
    },
    subscriber_full_name: {
        type: String,
    },
    company_name: {
        type: String
    },
    subscriber_email: {
        type: String,
        // unique: [true, 'Email Already Exists']
    },
    subscriber_mobile: {
        type: String,
        // unique: [true, 'Mobile Already Exists']

    },
    subscriber_type_id: {
        type: String
    },
    subscriber_status_id: {
        type: String
    },
    industry_id: {
        type: String
    },
    address: {
        type: String
    },
    country_id: {
        type: String
    },
    gst_no: {
        type: String,
        // unique: [true, 'GST Number Already Exists']
    },
    state_id: {
        type: String
    },
    city_id: {
        type: String
    },
    payment_mode: {
        type: String
    },
    updated_by: {
        type: String
    },
    datetime_created: {
        type: Date,
        default: Date.now
    },
    datetime_updated: {
        type: Date,
        default: Date.now
    }
});

subscriberSchema.pre('save', function (next) {
    const doc = this;
    if (!doc.subscriber_id) {
      const randomBytes = crypto.randomBytes(6);
      const randomID = randomBytes
        .toString('hex')
        .toUpperCase()
        .replace(/[A-F]/g, '');
      doc.subscriber_id = `ABC${randomID}`;
    }
    next();
  });

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

module.exports = Subscriber;
