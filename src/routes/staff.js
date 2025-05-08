const router = require('express').Router();
const bookController = require('../app/controllers/BookingController');
const AuthMiddleware = require('../app/midleware/AuthMiddleWare');

// Hiển thị danh sách đơn đặt phòng
router.get('/', AuthMiddleware.verifyToken, bookController.showStaffBookings);

// Hiển thị lịch sử đặt phòng
router.get('/history', AuthMiddleware.verifyToken, bookController.showBookingHistory);

// Hiển thị form đặt phòng tại quầy
router.get('/bookAtCounter', AuthMiddleware.verifyToken, bookController.showBookAtCounter);

// Xử lý đặt phòng tại quầy
router.post('/counter', AuthMiddleware.verifyToken, bookController.handleBookAtCounter);

// Tìm kiếm phòng trống
router.get('/rooms/available', AuthMiddleware.verifyToken, bookController.searchAvailableRoomsForStaff);

// Hiển thị form chỉnh sửa đơn đặt phòng
router.get('/bookings/:bookingId/edit', AuthMiddleware.verifyToken, bookController.editBooking);

// Cập nhật đơn đặt phòng
router.post('/bookings/:bookingId/update', AuthMiddleware.verifyToken, bookController.updateBooking);

// Xóa mềm đơn đặt phòng
router.post('/bookings/:bookingId/delete', AuthMiddleware.verifyToken, bookController.deleteBooking);

// Tìm kiếm đơn đặt phòng
router.get('/search', AuthMiddleware.verifyToken, bookController.searchBookings);

// Hiển thị thùng rác
router.get('/trash', AuthMiddleware.verifyToken, bookController.showTrash);

// Khôi phục đơn đặt phòng
router.post('/bookings/:bookingId/restore', AuthMiddleware.verifyToken, bookController.restoreBooking);

// Xóa vĩnh viễn đơn đặt phòng
router.post('/bookings/:bookingId/force-delete', AuthMiddleware.verifyToken, bookController.forceDeleteBooking);

module.exports = router;