const bookingController = require('../app/controllers/BookingController');
const router = require('express').Router();

router.get('/:id', bookingController.showBookingPage);
router.post('/:id/confirm', bookingController.confirmBooking);
// router.get('/success', bookingController.success);
router.post('/:bookingId/status', bookingController.updateBookingStatus);

module.exports = router;

