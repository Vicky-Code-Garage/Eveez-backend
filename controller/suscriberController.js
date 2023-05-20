const Subscriber = require('../model/suscriberModel');

// Create a new subscriber
const createSubscriber = async (subscriberData) => {
  try {
    const subscriber = new Subscriber(subscriberData);
    const savedSubscriber = await subscriber.save();
    resizeBy.status(200).json(savedSubscriber);
    return ;
  } catch (error) {
    console.log('Failed to create a new subscriber', error);
  }
};

// Get all subscribers
const getAllSubscribers = async () => {
  try {
    const subscribers = await Subscriber.find();
    return subscribers;
  } catch (error) {
    throw new Error('Failed to retrieve subscribers');
  }
};

// Get a subscriber by ID
const getSubscriberById = async (subscriberId) => {
  try {
    const subscriber = await Subscriber.findById(subscriberId);
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    return subscriber;
  } catch (error) {
    throw new Error('Failed to retrieve subscriber');
  }
};

// Update a subscriber
const updateSubscriber = async (subscriberId, updateData) => {
  try {
    const subscriber = await Subscriber.findByIdAndUpdate(subscriberId, updateData, {
      new: true,
    });
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    return subscriber;
  } catch (error) {
    throw new Error('Failed to update subscriber');
  }
};

// Delete a subscriber
const deleteSubscriber = async (subscriberId) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(subscriberId);
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    return subscriber;
  } catch (error) {
    throw new Error('Failed to delete subscriber');
  }
};

module.exports = {
  createSubscriber,
  getAllSubscribers,
  getSubscriberById,
  updateSubscriber,
  deleteSubscriber,
};
