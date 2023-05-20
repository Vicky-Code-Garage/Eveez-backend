const express = require('express');
const { createSubscriber } = require('../controller/suscriberController');

const router = express.Router();
router.route('/create').post(createSubscriber);


module.exports = router;