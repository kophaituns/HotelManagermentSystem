const router = require('express').Router();
const bookingController = require('../app/controllers/BookingController');


router.get('/:id/availability', bookingController.getRoomAvailability);

router.get('/', bookingController.searchAvailableRooms); // Tìm kiếm phòng

module.exports = router;