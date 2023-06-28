const express = require('express');
const router = express.Router();
const GigWorker = require('../model/gigWorker.js');
const Razorpay = require('razorpay');
const { logroute } = require('../logger/lgs.js');
const e = require('express');

router.get("/", async (req, res) => {
  res.send("Gig Worker Controller is working fine at /gig-workers");
});

// Create a gig worker
router.post('/gig-workers', async (req, res) => {
  try {
    const gigWorker = await GigWorker.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Gig worker created',
      data: gigWorker
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all gig workers
router.get('/gig-workers', async (req, res) => {
  try {
    const gigWorkers = await GigWorker.find();
    res.json(gigWorkers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a gig worker by ID
router.get('/gig-worker/:id', async (req, res) => {
  try {
    const gigWorker = await GigWorker.findOne({
      worker_id: `${req.params.id}`
    });
    if (!gigWorker) {
      return res.status(404).json({ error: 'Gig worker not found' });
    }
    res.json(gigWorker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a gig worker by ID
router.put('/gig-workers/:id', async (req, res) => {
  try {
    const gigWorker = await GigWorker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!gigWorker) {
      return res.status(404).json({ error: 'Gig worker not found' });
    }
    res.json(gigWorker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a gig worker by ID
router.delete('/gig-workers/:id', async (req, res) => {
  try {
    const gigWorker = await GigWorker.findOneAndDelete({
      worker_id: `${req.params.id}`
    });
    if (!gigWorker) {
      return res.status(404).json({ error: 'Gig worker not found' });
    }
    res.status(200).json({ success: true, message: 'Gig worker deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/razorpay', async (req, res) => {
  try {
    const { amount, currency, receipt, payment_capture } = req.body;
    const options = {
      amount: amount * 100,
      currency,
      receipt,
      payment_capture
    };
    const response = await razorpay.orders.create(options);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

async function verifyPayment(req, res) {
  const { order_id, payment_id, signature } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (generatedSignature === signature) {

    res.json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.json({ success: false, message: 'Payment verification failed' });
  }
}

router.post('/weekly-payments', async (req, res) => {
  try {
    const { worker_id, weeklyPayment } = req.body;
    const gigWorker = await GigWorker.findOne({ worker_id });
    if (!gigWorker) {
      return res.status(404).json({ error: 'Gig worker not found' });
    }
    if (!gigWorker.weeklyPayments) {
      gigWorker.weeklyPayments = [];
      gigWorker.weeklyPayments.push(weeklyPayment);
    }
    else {
      gigWorker.weeklyPayments.push(weeklyPayment);
    }
    await gigWorker.save();
    res.status(201).json({
      success: true,
      message: 'Weekly payment created',
      payment: weeklyPayment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/status', async (req, res) => {
  try {
    const { worker_id, day, month, year } = req.body;
    let installment = 1;
    if (day > 7 && day <= 14) {
      installment = 2;
    } else if (day > 14 && day <= 21) {
      installment = 3;
    } else if (day > 21 && day <= 31) {
      installment = 4;
    }
    const gigWorker = await GigWorker.findOne({ worker_id });
    if (!gigWorker) {
      return res.status(404).json({ error: 'Gig worker not found' });
    }
    if (gigWorker.status === 'Deactive') {
      return res.status(200).json({
        active: false,
        message: 'Gig worker is inactive'
      });
    }

    if (!gigWorker.weeklyPayments || gigWorker.weeklyPayments.length === 0) {
      return res.status(200).json({
        active: true,
        paid: false,
        message: 'Gig worker has no payments history'
      });
    }

    gigWorker.weeklyPayments.forEach((weeklyPayment) => {
      if (weeklyPayment.installment === installment && weeklyPayment.month === month && weeklyPayment.year === year) {
        return res.status(200).json({
          active: true,
          paid: true,
          message: 'Gig worker installment has already been paid'
        });
      }
    });
    res.status(200).json({
      active: true,
      paid: false,
      message: 'Gig worker installment has not been paid'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/gig-workers/bulk-active', async (req, res) => {
  logroute(req)
  try {
    const gig_workers = JSON.parse(req.body.gig_workers);
    gig_workers.forEach(async (gig_worker) => {
      const gigWorkers = await GigWorker.findOne({
        worker_id: gig_worker.worker_id
      });
      if (gigWorkers) {
        gigWorkers.status = gig_worker.status;
        await gigWorkers.save();
      }
    });
    res.status(200).json({
      success: true,
      message: 'Gig workers status updated'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/gig-workers/bulk-update', async (req, res) => {
  logroute(req)
  try {
    const gig_workers = JSON.parse(req.body.gig_workers);
    gig_workers.forEach(async (gig_worker) => {
      if (gig_worker.worker_id && gig_worker.name) {
        const gigWorkers = await GigWorker.findOne({
          worker_id: gig_worker.worker_id
        });
        if (!gigWorkers) {
          await GigWorker.create({
            worker_id: gig_worker.worker_id,
            name: gig_worker.name,
            vehicle_no: gig_worker.vehicle_no,
            phoneNumber: gig_worker.phoneNumber,
            organization: gig_worker.organization,
            plan: gig_worker.plan,
            join_date: gig_worker.join_date,
            weeklyPayments: [],
            weeklyAmountToPay: gig_worker.weeklyAmountToPay,
            status: gig_worker.status

          });
        } else {
          gigWorkers.name = gig_worker.name ? gig_worker.name : gigWorkers.name;
          gigWorkers.vehicle_no = gig_worker.vehicle_no ? gig_worker.vehicle_no : gigWorkers.vehicle_no;
          gigWorkers.phoneNumber = gig_worker.phoneNumber ? gig_worker.phoneNumber : gigWorkers.phoneNumber;
          gigWorkers.organization = gig_worker.organization ? gig_worker.organization : gigWorkers.organization;
          gigWorkers.plan = gig_worker.plan ? gig_worker.plan : gigWorkers.plan;
          gigWorkers.join_date = gig_worker.join_date ? gig_worker.join_date : gigWorkers.join_date;
          gigWorkers.weeklyAmountToPay = gig_worker.weeklyAmountToPay ? gig_worker.weeklyAmountToPay : gigWorkers.weeklyAmountToPay;
          gigWorkers.status = gig_worker.status ? gig_worker.status : gigWorkers.status;
          await gigWorkers.save();
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Gig workers status updated'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/gig-workers/bulk-delete', async (req, res) => {
  logroute(req)
  try {
    await GigWorker.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'Gig workers deleted'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
