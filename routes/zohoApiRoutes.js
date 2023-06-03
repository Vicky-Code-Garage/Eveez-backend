const express = require('express');
const {getAccessToken, getInvoicesByRiderId, refreshAccessToken, createPaymentByInvoiceId, createOrder, verifyPayment, createInvoice, createCustomer, createDamageInvoice, createBulkInvoices} = require('../controller/zohoApiCredentialController.js');
const {isAuthenticated} = require('../middlewares/auth.js');

const router = express.Router();
router.route('/refreshaccesstoken').post(refreshAccessToken);
router.route('/getaccesstoken').get(getAccessToken, isAuthenticated);
router.route('/getinvoicesbyid').get(getInvoicesByRiderId);
router.route('/createpayment').post(createPaymentByInvoiceId);
router.route('/createrazorpayorder').post(createOrder);
router.route('/verifyrazorpaypayment').post(verifyPayment);
router.route('/createinvoice').post(createInvoice);
router.route('/createcustomer').post(createCustomer);
router.route('/damageinvoice').post(createDamageInvoice);
router.route('/bulkinvoices').post(createBulkInvoices);

module.exports = router;