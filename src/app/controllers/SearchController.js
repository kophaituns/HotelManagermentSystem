const Room = require('../model/Room');
const RoomType = require('../model/RoomType'); 
const moment = require('moment');
const SearchController = 
{
  searchRooms: async (req, res) => {
    try {
      const { checkin, checkout, roomCount, adults, children } = req.query;

      // Kiểm tra dữ liệu đầu vào
      if (!checkin || !checkout || !roomCount || !adults) {
          return res.status(400).render('search', {
              rooms: [],
              error: 'Vui lòng cung cấp đầy đủ thông tin: ngày nhận phòng, trả phòng, số phòng, số người lớn.'
          });
      }

      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const totalGuests = parseInt(adults) + parseInt(children || 0);
      const requiredRooms = parseInt(roomCount);

      // Kiểm tra ngày hợp lệ
      if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
          return res.status(400).render('search', {
              rooms: [],
              error: 'Ngày trả phòng phải sau ngày nhận phòng và các ngày phải hợp lệ.'
          });
      }

      // Kiểm tra số phòng và số khách
      if (requiredRooms < 1 || totalGuests < 1) {
          return res.status(400).render('search', {
              rooms: [],
              error: 'Số phòng và số khách phải lớn hơn 0.'
          });
      }

      // Tìm phòng khả dụng
      const availableRooms = await Room.find({
          status: 'available',
          capacity: { $gte: Math.ceil(totalGuests / requiredRooms) }, // Đảm bảo mỗi phòng chứa đủ số khách trung bình
          remaining: { $gte: 1 } // Đảm bảo còn phòng
      })
      .populate('typeId', 'name description basePrice thumbnail amenitiesPreview') // Lấy thông tin loại phòng
      .lean();

      // Chuyển đổi dữ liệu để dùng trong template
      const roomsWithType = availableRooms.map(room => ({
          ...room,
          roomType: room.typeId,
          amenities: {
            ...room.amenities,
            bathroom: room.amenities.bathroom ? room.amenities.bathroom.join(", ") : "" // Chuyển mảng bathroom thành chuỗi
        }
      }));

      // Hiển thị kết quả tìm kiếm
      res.render('rooms/search', {
          rooms: roomsWithType,
          checkin,
          checkout,
          roomCount,
          adults,
          children
      });
  } catch (error) {
      console.error(error);
      res.status(500).render('search', {
          rooms: [],
          error: 'Đã xảy ra lỗi khi tìm kiếm phòng. Vui lòng thử lại.'
      });
  }
},
};
module.exports = SearchController;