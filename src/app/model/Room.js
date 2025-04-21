const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true },
  typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType' },
  status: { type: String, enum: ['available', 'booked', 'occupied', 'unavailable'], default: 'available' }
});

module.exports = mongoose.model('Room', roomSchema);
