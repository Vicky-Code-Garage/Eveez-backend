const express = require('express');
const {getAccessToken, getInvoicesByRiderId, refreshAccessToken, createPaymentByInvoiceId, createOrder, verifyPayment, createInvoice, createCustomer, createDamageInvoice, createBulkInvoices, createInvoiceWithCustomers, createSingleInvoice, createSingleInvoiceNew} = require('../controller/zohoApiCredentialController.js');
const {isAuthenticated} = require('../middlewares/auth.js');

const router = express.Router();
router.route('/refreshaccesstoken').post(refreshAccessToken);
router.route('/getaccesstoken').get(getAccessToken, isAuthenticated);
router.route('/getinvoicesbyid').post(getInvoicesByRiderId);
router.route('/createpayment').post(createPaymentByInvoiceId);
router.route('/createrazorpayorder').post(createOrder);
router.route('/verifyrazorpaypayment').post(verifyPayment);
router.route('/createsingleinvoice').post(createSingleInvoice);
router.route('/createsingleinvoicenew').post(createSingleInvoiceNew);
router.route('/createinvoice').post(createInvoice);
router.route('/createinvoicewithcustomer').post(createInvoiceWithCustomers);
router.route('/createcustomer').post(createCustomer);
router.route('/damageinvoice').post(createDamageInvoice);
router.route('/bulkinvoices').post(createBulkInvoices);

module.exports = router;