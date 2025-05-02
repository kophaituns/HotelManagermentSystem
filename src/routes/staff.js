const router = require('express').Router();
const bookController = require('../app/controllers/BookingController');


router.post('/counter', bookController.handleBookAtCounter); // Tạo đặt phòng
router.get('/bookAtCounter', bookController.showBookAtCounter); // Tạo đặt phòng
router.get('/history', bookController.showBookingHistory); // Lịch sử đặt phòng 
router.get('/', bookController.showStaffBookings); // Danh sách đặt phòng

module.exports = router;