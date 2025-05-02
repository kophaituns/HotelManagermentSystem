const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');
const Booking = require('./Booking'); // Import Booking model

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên phòng
  typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType' }, // Tham chiếu loại phòng
  status: {
    type: String,
    enum: ['available', 'booked', 'occupied', 'unavailable'],
    default: 'available'
  },
  images: [{ type: String }], // Danh sách URL ảnh
  capacity: { type: Number, default: 2 }, // Sức chứa người
  size: { type: Number }, // Diện tích (m²)
  view: { type: String }, // Hướng nhìn (vd: Ocean View)
  floor: { type: String }, // Tầng
  amenities: {
    beds: { type: String }, // VD: 1 King Bed
    bathroom: [String], // VD: ["Freestanding Bath", "Walk-in Shower"]
    appliances: [String], // VD: ["Stocked Minibar"]
    outdoorItems: [String], // VD: ["Furnished Balcony"]
    smokingPolicy: { type: String }, // VD: "Non-Smoking"
  },
  description: { type: String }, // Mô tả tùy chỉnh
  price: { type: Number, required: true }, // Giá tiền 1 đêm
  initialRemaining: { type: Number, required: true }, // Số lượng phòng ban đầu
  remaining: { type: Number, required: true }, // Số lượng phòng còn lại
});

// Middleware để cập nhật remaining khi tạo booking
roomSchema.statics.updateRemainingOnBooking = async function (booking) {
  const room = await this.findById(booking.roomId);
  if (!room) return;

  if (booking.status === 'pending' || booking.status === 'confirmed') {
    room.remaining = Math.max(0, room.remaining - booking.roomCount);
  } else if (booking.status === 'cancelled') {
    room.remaining = Math.min(room.initialRemaining, room.remaining + booking.roomCount);
  }
  await room.save();
};

// Middleware để khôi phục remaining sau checkout
roomSchema.statics.restoreRemainingAfterCheckout = async function () {
  const now = new Date();
  const expiredBookings = await Booking.find({
    checkout: { $lt: now },
    status: { $in: ['pending', 'confirmed'] },
  });

  for (const booking of expiredBookings) {
    const room = await this.findById(booking.roomId);
    if (room) {
      room.remaining = Math.min(room.initialRemaining, room.remaining + booking.roomCount);
      await room.save();
      // Cập nhật trạng thái booking thành 'completed' hoặc xóa
      booking.status = 'completed';
      await booking.save();
    }
  }
};

roomSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
});

module.exports = mongoose.model('Room', roomSchema);