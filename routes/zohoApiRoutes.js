const express = require('express');
const {getAccessToken, getInvoicesByRiderId, refreshAccessToken, createPaymentByInvoiceId} = require('../controller/zohoApiCredentialController.js');
const {isAuthenticated} = require('../middlewares/auth.js');

const router = express.Router();
router.route('/refreshaccesstoken').post(refreshAccessToken);
router.route('/getaccesstoken').get(getAccessToken, isAuthenticated);
router.route('/getinvoicesbyid').get(getInvoicesByRiderId);
router.route('/createpayment').post(createPaymentByInvoiceId);


module.exports = router;