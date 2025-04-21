const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // VD: "Deluxe", "Suite"
  description: { type: String }, // Mô tả ngắn cho loại phòng
  basePrice: { type: Number, required: true }, // Giá cơ bản, sau này có thể tính biến động
  thumbnail: { type: String }, // Ảnh đại diện loại phòng
  amenitiesPreview: [String], // Xem nhanh tiện nghi nổi bật (nếu muốn show trước)
}, { timestamps: true });

module.exports = mongoose.model('RoomType', roomTypeSchema);
