const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },      // Tài khoản đăng nhập
  passwordHash: { type: String, required: true },                // Mật khẩu đã mã hóa
  isAdmin: { type: Boolean, default: false },                    // true = Admin, false = Staff

  // Thông tin nhân viên
  name: { type: String, required: true },                        // Họ tên
  email: { type: String, required: true, unique: true },         // Email
  dob: { type: Date },                                         // Ngày sinh (có thể lưu dạng chuỗi)
  phone: { type: String },                                       // Số điện thoại
  role: { type: String, default: 'Nhân viên' },                  // Vai trò hiển thị (Admin/Nhân viên)
  avatar: { type: String, default: '/images/default-avatar.jpg' } // Ảnh đại diện
}, {
  timestamps: true
});

// Thêm index để tối ưu tìm kiếm theo name
userSchema.index({ name: 'text' });

// Thêm index để tối ưu truy vấn danh sách nhân viên
userSchema.index({ isAdmin: 1, deleted: 1 });

// Plugin xóa mềm
userSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
});

module.exports = mongoose.model('User', userSchema);