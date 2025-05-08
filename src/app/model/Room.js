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
  remaining: { type: Number}, // Số lượng phòng còn lại
});

// Cập nhật remaining khi đặt phòng
roomSchema.statics.updateRemainingOnBooking = async function (booking) {
  const room = await this.findById(booking.roomId);
  if (!room) {
    throw new Error('Không tìm thấy phòng');
  }

  // Tính lại remaining dựa trên các đơn đặt phòng hiện tại
  const conflictingBookings = await mongoose.model('Booking').find({
    roomId: booking.roomId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { checkin: { $lte: booking.checkout } },
      { checkout: { $gte: booking.checkin } },
    ],
  }).lean();

  const bookedCount = conflictingBookings.reduce((sum, b) => sum + b.roomCount, 0);
  room.remaining = Math.max(0, room.initialRemaining - bookedCount);
  await room.save();

  console.log(`Cập nhật remaining cho phòng ${room._id}:`, { remaining: room.remaining, bookedCount });
};

// Khôi phục remaining khi đặt phòng hết hạn
roomSchema.statics.restoreRemaining = async function (roomId, checkoutDate) {
  const room = await this.findById(roomId);
  if (!room) {
    return;
  }

  const activeBookings = await mongoose.model('Booking').find({
    roomId,
    status: { $in: ['pending', 'confirmed'] },
    checkout: { $gt: checkoutDate },
  }).lean();

  const bookedCount = activeBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
  room.remaining = room.initialRemaining - bookedCount;
  await room.save();

  console.log(`Khôi phục remaining cho phòng ${room._id}:`, { remaining: room.remaining, bookedCount });
};
roomSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
});

module.exports = mongoose.model('Room', roomSchema);