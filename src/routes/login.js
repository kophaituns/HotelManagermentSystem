const router = require('express').Router(); 
const LoginController = require('../app/controllers/LoginController');


router.get('/', LoginController.index); // / => /index

module.exports = router; 