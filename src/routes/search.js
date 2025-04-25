const router = require('express').Router();
const searchController = require('../app/controllers/SearchController');

router.get('/', searchController.searchRooms); // Tìm kiếm phòng

module.exports = router;