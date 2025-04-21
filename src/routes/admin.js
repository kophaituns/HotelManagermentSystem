const adminController = require('../app/controllers/admins/AdminController');
const router = require('express').Router();
const upload = require('../app/midleware/UploadMiddleWare');
const roomController = require('../app/controllers/admins/RoomController');

// Room Controller
router.get('/room', roomController.getRoom); // /admin => /room




// admin Controller
router.patch('/employee/restore/:id', adminController.restoreEmployee); // /admin => /restoreEmployee/:id
router.delete('/employee/forceDelete/:id', adminController.forceDeleteEmployee); // /admin => /forceDelete/:id
router.get('/trash', adminController.trashEmployee); // /admin => /trash
router.delete('/employee/delete/:id', adminController.deleteEmployee); // /admin => /deleteEmployee/:id
router.put('/employee/update/:id', upload.single('avatar'), adminController.updateEmployee);// /admin => /updateEmployee/:id
router.get('/employee/edit/:id', adminController.editEmployee); // /admin => /editEmployee/:id
router.get('/employee/show/:id', adminController.showEmployee); // /admin => /showEmployee/:id
router.post('/employee/store', upload.single('avatar'), adminController.storeEmployee); // Post Store Employee
router.get('/employee/create', adminController.createEmployee); // /admin => /create
router.get('/employee', adminController.getEmployee); // /admin => /employee
router.get('/', adminController.index); // /admin => /index

module.exports = router;