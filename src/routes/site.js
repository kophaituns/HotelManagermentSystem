const router = require('express').Router(); 
const siteController = require('../app/controllers/SiteController');


router.get('/', siteController.index); // / => /index

module.exports = router; 