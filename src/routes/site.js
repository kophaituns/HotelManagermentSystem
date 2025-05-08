const router = require('express').Router(); 
const siteController = require('../app/controllers/SiteController');
const middlewareController = require('../app/midleware/AuthMiddleWare');


router.get('/profile',middlewareController.verifyToken, siteController.getProfile); // / => /login
router.get('/', siteController.index); // / => /index

module.exports = router; 