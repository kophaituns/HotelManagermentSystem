const adminController = require('../app/controllers/admins/AdminController');
const router = require('express').Router();
const upload = require('../app/midleware/UploadMiddleWare');
const roomController = require('../app/controllers/admins/RoomController');
const AuthMiddleware = require('../app/midleware/AuthMiddleWare');

// Báo cáo doanh thu
router.get('/revenue-report',AuthMiddleware.verifyTokenAndAdminAuth, adminController.getRevenueReport);

// Room Controller
router.get('/room/trash',AuthMiddleware.verifyTokenAndAdminAuth, roomController.trashRoom); // /admin => /trashRoom
router.post('/room/store',AuthMiddleware.verifyTokenAndAdminAuth, upload.array('images',5),roomController.storeRoom); // Post Store Room
router.get('/room/create',AuthMiddleware.verifyTokenAndAdminAuth, roomController.createRoom); // /admin => /createRoom
router.patch('/room/restore/:id',AuthMiddleware.verifyTokenAndAdminAuth, roomController.restoreRoom);  // /admin => /restoreRoom/:id
router.delete('/room/force-delete/:id',AuthMiddleware.verifyTokenAndAdminAuth, roomController.forceDeleteRoom); // /admin => /forceDelete/:id
router.delete('/room/delete/:id',AuthMiddleware.verifyTokenAndAdminAuth, roomController.deleteRoom); // /admin => /deleteRoom/:id
router.get('/room/:id/edit',AuthMiddleware.verifyTokenAndAdminAuth, roomController.editRoom); // /admin => /editRoom/:id
router.put('/room/:id',AuthMiddleware.verifyTokenAndAdminAuth, upload.array('images',5),roomController.updateRoom); // /admin => /updateRoom/:id
router.get('/room/:id',AuthMiddleware.verifyTokenAndAdminAuth, roomController.showRoom); // /admin => /room/:id
router.get('/room',AuthMiddleware.verifyTokenAndAdminAuth, roomController.getRoom); // /admin => /room



// admin Controller
router.patch('/employee/restore/:id',AuthMiddleware.verifyTokenAndAdminAuth, adminController.restoreEmployee); // /admin => /restoreEmployee/:id
router.delete('/employee/forceDelete/:id',AuthMiddleware.verifyTokenAndAdminAuth, adminController.forceDeleteEmployee); // /admin => /forceDelete/:id
router.get('/trash',AuthMiddleware.verifyTokenAndAdminAuth, adminController.trashEmployee); // /admin => /trash
router.delete('/employee/delete/:id',AuthMiddleware.verifyTokenAndAdminAuth, adminController.deleteEmployee); // /admin => /deleteEmployee/:id
router.put('/employee/update/:id',AuthMiddleware.verifyTokenAndAdminAuth, upload.single('avatar'), adminController.updateEmployee);// /admin => /updateEmployee/:id
router.get('/employee/edit/:id',AuthMiddleware.verifyTokenAndAdminAuth, adminController.editEmployee); // /admin => /editEmployee/:id
router.get('/employee/show/:id',AuthMiddleware.verifyTokenAndAdminAuth, adminController.showEmployee); // /admin => /showEmployee/:id
router.post('/employee/store',AuthMiddleware.verifyTokenAndAdminAuth, upload.single('avatar'),adminController.storeEmployee); // Post Store Employee
router.get('/employee/create',AuthMiddleware.verifyTokenAndAdminAuth, adminController.createEmployee); // /admin => /create
router.get('/employee',AuthMiddleware.verifyTokenAndAdminAuth, adminController.getEmployee); // /admin => /employee
router.get('/',AuthMiddleware.verifyTokenAndAdminAuth, adminController.index); // /admin => /index

module.exports = router;