const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  status: { type: String, enum: ['pending', 'confirmed', 'canceled'], default: 'pending' },
  checkIn: Date,
  checkOut: Date
});

module.exports = mongoose.model('Booking', bookingSchema);
