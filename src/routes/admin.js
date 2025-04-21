const adminController = require('../app/controllers/admins/AdminController');
const router = require('express').Router();
const upload = require('../app/midleware/UploadMiddleWare');

router.post('/employee/store', upload.single('avatar'), adminController.storeEmployee); // Post Store Employee
router.get('/employee/create', adminController.createEmployee); // /admin => /create
router.get('/employee', adminController.getEmployee); // /admin => /employee
router.get('/', adminController.index); // /admin => /index

module.exports = router;