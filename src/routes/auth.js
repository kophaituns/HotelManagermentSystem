const router = require('express').Router();
const authController = require('../app/controllers/AuthController');


router.post('/login',authController.login);
router.post('/register',authController.register );


module.exports = router;    