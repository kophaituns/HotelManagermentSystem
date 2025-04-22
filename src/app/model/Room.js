const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true }, // Số phòng
  typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType' }, // Tham chiếu loại phòng
  status: {
    type: String,
    enum: ['available', 'booked', 'occupied', 'unavailable'],
    default: 'available'
  },
  // Thêm chi tiết mới
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
  remaining: { type: Number }, // Số lượng còn lại
});

roomSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
});


module.exports = mongoose.model('Room', roomSchema);
