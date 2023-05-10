const express = require('express');
const {getAccessToken} = require('../controller/zohoApiCredentialController.js');

const router = express.Router();
router.route('/getAccessToken').post(getAccessToken);


module.exports = router;