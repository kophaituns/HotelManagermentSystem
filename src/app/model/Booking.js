const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },

  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  },

  isPaid: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['vnpay', 'momo', 'paypal', 'cash'], default: 'cash' },

  staffConfirmBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ai duyệt
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },

  totalPrice: { type: Number }, // tiền đã tính sẵn

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
