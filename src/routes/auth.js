const router = require('express').Router();
const authController = require('../app/controllers/AuthController');

router.get('/logout', authController.logout);
router.post('/login',authController.login);

module.exports = router;    