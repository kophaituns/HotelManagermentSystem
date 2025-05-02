const Room = require('../model/Room');
const RoomType = require('../model/RoomType');

const SiteController = {
  index : async (req, res) => {
    try {
      // Lấy danh sách phòng có trạng thái là 'available'
      const rooms = await Room.find({ status: 'available' })
        .limit(5)
        .populate('typeId');

      // Lấy tất cả loại phòng để hiển thị trong lựa chọn
      const roomTypes = await RoomType.find();

      // Truyền ảnh đầu tiên của mỗi phòng thay vì mảng images
      const roomsWithFirstImage = rooms.map(room => ({
        ...room.toObject(),
        firstImage: room.images && room.images[0] ? room.images[0] : null,
      }));

      // Render trang chủ và truyền dữ liệu vào view
      res.render('users/home', {
        rooms: roomsWithFirstImage,
        roomTypes,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching rooms for homepage');
    }
  }, 
}

module.exports = SiteController;