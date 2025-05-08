const router = require('express').Router();
const bookingController = require('../app/controllers/BookingController');


router.get('/:id/availability', bookingController.getRoomAvailability); // Kiểm tra tình trạng phòng

router.get('/', bookingController.searchAvailableRooms); // Tìm kiếm phòng

module.exports = router;