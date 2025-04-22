const Room = require('../../model/Room')
const { mutipleMongooseToObject , mongooseToObject } = require('../../../util/mongoose');
const RoomType = require('../../model/RoomType')

const RoomController = {
    // Hiển thị danh sách phòng
   getRoom(req, res, next) {
        Room.find({})
            .populate('typeId')
            .then((rooms) => {
                res.render('rooms/index', {
                    rooms: mutipleMongooseToObject(rooms),
                });
            })
            .catch(next);
    },
    
    // Hiển thị trang thêm phòng
    createRoom(req, res, next) {
        RoomType.find({})
            .then((roomTypes) => {
                res.render('rooms/create', {
                    roomTypes: mutipleMongooseToObject(roomTypes),
                });
            })
            .catch(next);
    },
    // Thêm phòng mới
    storeRoom(req, res, next) {
        const roomData = req.body;

        // Nếu có ảnh được upload, thêm các URL ảnh vào mảng images
        if (req.files && req.files.length > 0) {
          roomData.images = req.files.map(file => file.path); // Lưu các URL từ Cloudinary
        }
      
        const room = new Room(roomData);
        room
          .save()
          .then(() => res.redirect('/admin/room'))
          .catch((error) => {
            console.log(error);
            res.status(500).send('Error creating room: ' + error.message);
          });   
    },
    // Hiển thị thông tin chi tiết phòng
   showRoom (req, res, next) {
        Room.findById(req.params.id)
            .populate('typeId')
            .then((room) => {
                if (!room) {
                    return res.status(404).send('Room not found');
                }
                res.render('rooms/show', {
                    room: mongooseToObject(room),
                });
            })
            .catch(next);
    },
    // Hiển thị trang chỉnh sửa phòng
    editRoom (req, res, next) {
        const roomId = req.params.id;
        Promise.all([
            Room.findById(roomId).populate('typeId'),
            RoomType.find({}),
        ])
            .then(([room, roomTypes]) => {
                if (!room) {
                    return res.status(404).send('Room not found');
                }
                res.render('rooms/edit', {
                    room: mongooseToObject(room),
                    roomTypes: mutipleMongooseToObject(roomTypes),
                });
            })
            .catch(next);
    },
    updateRoom (req, res, next) {
        const roomId = req.params.id;
        const roomData = req.body;

        // Nếu có ảnh được upload, thêm các URL ảnh vào mảng images
        if (req.files && req.files.length > 0) {
          roomData.images = req.files.map(file => file.path); // Lưu các URL từ Cloudinary
        }
        Room.findByIdAndUpdate(roomId, roomData, { new: true })
            .then(() => res.redirect('/admin/room'))
            .catch(next);
    },
    // Xóa phòng (chỉ đánh dấu là đã xóa)
   deleteRoom (req, res, next) {
        const roomId = req.params.id;
        Room.delete({ _id: roomId })
            .then(() => res.redirect('/admin/room'))
            .catch(next);
   },
    // Khôi phục phòng đã xóa
    restoreRoom (req, res, next) {
        const roomId = req.params.id;
        Room.restore({ _id: roomId })
            .then(() => res.redirect('/admin/room'))
            .catch(next);
    },
    trashRoom (req, res, next) {
        Room.findWithDeleted({deleted: true})
            .populate('typeId')
            .then((rooms) => {
                res.render('rooms/trash', {
                    rooms: mutipleMongooseToObject(rooms),
                });
            })
            .catch(next);
    },
    forceDeleteRoom (req, res, next) {
        const roomId = req.params.id;
        Room.deleteOne({ _id: roomId })
            .then(() => res.redirect('/admin/room'))
            .catch(next);
    },
     
}
module.exports = RoomController;