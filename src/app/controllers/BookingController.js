const Room = require('../model/Room');
const Booking = require('../model/Booking');
const Customer = require('../model/Customer');
const RoomType = require('../model/RoomType');
const nodemailer = require('nodemailer');

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ptuan7205@gmail.com',
    pass: process.env.EMAIL_PASS || 'yiwu jloy xokl jwea',
  }
});

// Kiểm tra khách hàng qua email
exports.checkCustomer = async (req, res) => {
  try {
    const { email } = req.query;
    const customer = await Customer.findOne({ email }).lean();
    res.json(customer || {});
  } catch (error) {
    console.error('Lỗi kiểm tra khách hàng:', error);
    res.status(500).json({ message: 'Lỗi khi kiểm tra khách hàng.' });
  }
};

// Tìm phòng trống theo khoảng thời gian và loại phòng
exports.searchAvailableRooms = async (req, res) => {
  try {
    const { checkin, checkout, roomCount, adults, children, typeId } = req.query;

    console.log('Dữ liệu tìm kiếm:', { checkin, checkout, roomCount, adults, children, typeId });

    if (!checkin || !checkout || !roomCount || !adults) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('rooms/search', {
        rooms: [],
        roomTypes,
        error: 'Thiếu thông tin tìm kiếm. Vui lòng nhập lại thông tin.',
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);
    const adultsNum = parseInt(adults);
    const childrenNum = parseInt(children || 0);

    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('rooms/search', {
        rooms: [],
        roomTypes,
        error: 'Ngày nhận phòng và trả phòng không hợp lệ.',
      });
    }
    if (roomCountNum < 1 || adultsNum < 1) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('rooms/search', {
        rooms: [],
        roomTypes,
        error: 'Số phòng và số người lớn phải lớn hơn 0.',
      });
    }

    const roomTypes = await RoomType.find().lean();
    const query = typeId ? { typeId, deleted: false } : { deleted: false };
    const allRooms = await Room.find(query).populate('typeId').lean();

    // Lấy các đặt phòng có khả năng xung đột
    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    console.log('Các đơn đặt phòng tìm thấy:', bookings.map(b => ({
      _id: b._id,
      roomId: b.roomId,
      checkin: b.checkin,
      checkout: b.checkout,
      roomCount: b.roomCount,
      status: b.status
    })));

    // Kiểm tra và khôi phục remaining cho các phòng có đặt phòng đã hết hạn
    for (const room of allRooms) {
      await Room.restoreRemaining(room._id, new Date());
    }

    const availableRooms = allRooms.map(room => {
      // Lấy các đặt phòng xung đột với phòng này
      const conflictingBookings = bookings.filter(
        booking =>
          booking.roomId.toString() === room._id.toString() &&
          new Date(booking.checkin) <= checkoutDate &&
          new Date(booking.checkout) >= checkinDate
      );

      console.log(`Phòng ${room._id} - Đơn xung đột:`, conflictingBookings.map(b => ({
        _id: b._id,
        checkin: b.checkin,
        checkout: b.checkout,
        roomCount: b.roomCount
      })));

      // Nếu không có xung đột, sử dụng initialRemaining
      if (conflictingBookings.length === 0) {
        return { ...room, availableCount: room.initialRemaining };
      }

      // Tính số lượng phòng đã đặt
      const bookedCount = conflictingBookings.reduce(
        (sum, booking) => sum + booking.roomCount,
        0
      );
      const availableCount = room.initialRemaining - bookedCount;

      console.log(`Phòng ${room._id} - Tính toán:`, { initialRemaining: room.initialRemaining, bookedCount, availableCount });

      return { ...room, availableCount };
    }).filter(room => room.availableCount >= roomCountNum);

    if (availableRooms.length === 0) {
      return res.render('rooms/search', {
        rooms: [],
        roomTypes,
        checkin,
        checkout,
        roomCount: roomCountNum,
        adults: adultsNum,
        children: childrenNum,
        selectedTypeId: typeId,
        error: 'Không tìm thấy phòng trống phù hợp với số lượng yêu cầu.',
      });
    }

    res.render('rooms/search', {
      rooms: availableRooms,
      roomTypes,
      checkin,
      checkout,
      roomCount: roomCountNum,
      adults: adultsNum,
      children: childrenNum,
      selectedTypeId: typeId,
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm phòng:', error);
    const roomTypes = await RoomType.find().lean();
    res.status(500).render('rooms/search', {
      rooms: [],
      roomTypes,
      error: 'Đã xảy ra lỗi khi tìm kiếm phòng. Vui lòng thử lại.',
    });
  }
};

// Hiển thị lịch trống của phòng
exports.getRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).render('rooms/availability', {
        room: null,
        availability: [],
        error: 'Vui lòng cung cấp ngày bắt đầu và kết thúc.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).render('rooms/availability', {
        room: null,
        availability: [],
        error: 'Ngày bắt đầu và kết thúc không hợp lệ.',
      });
    }

    const room = await Room.findById(id).populate('typeId').lean();
    if (!room) {
      return res.status(404).render('rooms/availability', {
        room: null,
        availability: [],
        error: 'Không tìm thấy phòng.',
      });
    }

    console.log('Thông tin phòng:', { id: room._id, initialRemaining: room.initialRemaining, remaining: room.remaining });

    const bookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: end, $gte: start } },
        { checkout: { $gte: start, $lte: end } },
        { checkin: { $lte: start }, checkout: { $gte: end } },
      ],
    }).sort({ checkin: 1 }).lean();

    console.log('Các đơn đặt phòng xung đột:', bookings.map(b => ({
      _id: b._id,
      checkin: b.checkin,
      checkout: b.checkout,
      roomCount: b.roomCount,
      status: b.status
    })));

    const availability = [];
    let current = new Date(start);

    while (current < end) {
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);

      const conflictingBookings = bookings.filter(
        booking =>
          new Date(booking.checkin) <= nextDay &&
          new Date(booking.checkout) > current
      );

      const bookedCount = conflictingBookings.reduce(
        (sum, booking) => sum + booking.roomCount,
        0
      );
      const availableCount = room.initialRemaining - bookedCount;

      if (availableCount > 0) {
        availability.push({
          start: current.toLocaleDateString('vi-VN'),
          end: nextDay.toLocaleDateString('vi-VN'),
          availableCount,
        });
      }

      current = nextDay;
    }

    res.render('rooms/availability', {
      room,
      availability,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Lỗi lấy lịch trống:', error);
    res.status(500).render('rooms/availability', {
      room: null,
      availability: [],
      error: 'Đã xảy ra lỗi khi lấy lịch trống. Vui lòng thử lại.',
    });
  }
};

// Hiển thị trang đặt phòng
exports.showBookingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkin, checkout, roomCount, adults, children } = req.query;

    if (!checkin || !checkout || !roomCount || !adults) {
      return res.status(400).render('rooms/search', {
        rooms: [],
        error: 'Thiếu thông tin tìm kiếm. Vui lòng nhập lại thông tin.',
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);
    const adultsNum = parseInt(adults);
    const childrenNum = parseInt(children || 0);

    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      return res.status(400).render('rooms/search', {
        rooms: [],
        error: 'Ngày nhận phòng và trả phòng không hợp lệ.',
      });
    }
    if (roomCountNum < 1 || adultsNum < 1) {
      return res.status(400).render('rooms/search', {
        rooms: [],
        error: 'Số phòng và số người lớn phải lớn hơn 0.',
      });
    }

    const room = await Room.findById(id).populate('typeId').lean();
    if (!room) {
      return res.status(404).render('error', { message: 'Không tìm thấy phòng.' });
    }

    console.log('Thông tin phòng:', { id: room._id, initialRemaining: room.initialRemaining, remaining: room.remaining });

    // Truy vấn các đơn đặt phòng xung đột
    const conflictingBookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    console.log('Các đơn đặt phòng xung đột:', conflictingBookings.map(b => ({
      deleted: b.deleted,
      _id: b._id,
      checkin: b.checkin,
      checkout: b.checkout,
      roomCount: b.roomCount,
      status: b.status
    })));

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.initialRemaining - bookedCount;

    console.log('Tính toán phòng trống:', { initialRemaining: room.initialRemaining, bookedCount, availableCount, requested: roomCountNum });

    if (availableCount < roomCountNum) {
      return res.status(400).render('rooms/search', {
        rooms: [],
        error: `Không đủ phòng trống. Yêu cầu ${roomCountNum} phòng, nhưng chỉ còn ${availableCount} phòng.`,
      });
    }

    const days = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
    const totalPrice = room.price * roomCountNum * days;

    res.render('users/booking', {
      room: {
        ...room,
        amenities: {
          ...room.amenities,
          bathroom: room.amenities.bathroom ? room.amenities.bathroom.join(", ") : ""
        }
      },
      checkin,
      checkout,
      roomCount: roomCountNum,
      adults: adultsNum,
      children: childrenNum,
      totalPrice,
    });
  } catch (error) {
    console.error('Lỗi hiển thị trang đặt phòng:', error);
    res.status(500).render('error', { message: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
  }
};

// Xử lý xác nhận đặt phòng
// Trong confirmBooking
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice } = req.body;

    console.log('Dữ liệu đầu vào:', { id, checkin, checkout, roomCount, adults, children, totalPrice });
    // Validate input
    if (!checkin || !checkout || !roomCount || !adults || !totalPrice) {
      const roomData = await Room.findById(id).populate('typeId').lean();
      return res.status(400).render('users/booking', {
        room: roomData ? { ...roomData, amenities: { ...roomData.amenities, bathroom: roomData.amenities.bathroom ? roomData.amenities.bathroom.join(", ") : "" } } : null,
        checkin,
        checkout,
        roomCount,
        adults,
        children,
        totalPrice,
        error: 'Vui lòng cung cấp đầy đủ thông tin.',
        formData: { fullName, email, phone, address, idNumber },
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);

    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      const roomData = await Room.findById(id).populate('typeId').lean();
      return res.status(400).render('users/booking', {
        room: roomData ? { ...roomData, amenities: { ...roomData.amenities, bathroom: roomData.amenities.bathroom ? roomData.amenities.bathroom.join(", ") : "" } } : null,
        checkin,
        checkout,
        roomCount,
        adults,
        children,
        totalPrice,
        error: 'Ngày nhận phòng và trả phòng không hợp lệ.',
        formData: { fullName, email, phone, address, idNumber },
      });
    }

    const room = await Room.findById(id).populate('typeId').lean();
    if (!room) {
      return res.status(404).render('error', { message: 'Không tìm thấy phòng.' });
    }

    // Kiểm tra phòng trống
    const conflictingBookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.initialRemaining - bookedCount;

    if (availableCount < roomCountNum) {
      const roomData = await Room.findById(id).populate('typeId').lean();
      return res.status(400).render('users/booking', {
        room: roomData ? { ...roomData, amenities: { ...roomData.amenities, bathroom: roomData.amenities.bathroom ? roomData.amenities.bathroom.join(", ") : "" } } : null,
        checkin,
        checkout,
        roomCount,
        adults,
        children,
        totalPrice,
        error: `Không đủ phòng trống. Yêu cầu ${roomCountNum} phòng, nhưng chỉ còn ${availableCount} phòng.`,
        formData: { fullName, email, phone, address, idNumber },
      });
    }

    // Tạo hoặc cập nhật khách hàng
    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({
        fullName: fullName,
        email: email || '',
        phone: phone || '',
        address: address || '',
        idNumber: idNumber || '',
      });
      await customer.save();
    }

    // Tính tổng giá
    const days = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
    const calculatedTotalPrice = room.price * roomCountNum * days;
    if (parseFloat(totalPrice) !== calculatedTotalPrice) {
      const roomData = await Room.findById(id).populate('typeId').lean();
      return res.status(400).render('users/booking', {
        room: roomData ? { ...roomData, amenities: { ...roomData.amenities, bathroom: roomData.amenities.bathroom ? roomData.amenities.bathroom.join(", ") : "" } } : null,
        checkin,
        checkout,
        roomCount,
        adults,
        children,
        totalPrice,
        error: 'Tổng giá không hợp lệ. Vui lòng kiểm tra lại.',
        formData: { fullName, email, phone, address, idNumber },
      });
    }

    // Tạo booking
    const booking = new Booking({
      roomId: id,
      customerId: customer._id,
      checkin,
      checkout,
      roomCount: roomCountNum,
      adults,
      children,
      totalPrice,
      status: 'pending',

    });

    await booking.save();
    await Room.updateRemainingOnBooking(booking);

    // Gửi email xác nhận
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: email,
      subject: 'Xác nhận đặt phòng - Đang xét duyệt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${fullName},</h2>
          <p>Cảm ơn bạn đã đặt phòng tại Resort Biển 5 Sao. Đơn đặt phòng của bạn đang được xét duyệt.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${room.name} (${room.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${checkin}</p>
          <p><strong>Ngày trả phòng:</strong> ${checkout}</p>
          <p><strong>Số phòng:</strong> ${roomCount}</p>
          <p><strong>Tổng giá:</strong> ${totalPrice} VND</p>
          <p style="color: #343a40;">Chúng tôi sẽ thông báo khi đặt phòng được xác nhận hoặc hủy.</p>
        </div>
      `,
    });
    
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: 'phamanhtuan15@dtu.edu.vn',
      subject: 'Đơn đặt phòng mới - Cần xét duyệt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Đơn đặt phòng mới</h2>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${room.name} (${room.typeId.name || 'Không xác định'})</p>
          <p><strong>Khách hàng:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Số điện thoại:</strong> ${phone}</p>
          <p><strong>Ngày nhận phòng:</strong> ${checkin}</p>
          <p><strong>Ngày trả phòng:</strong> ${checkout}</p>
          <p><strong>Số phòng:</strong> ${roomCount}</p>
          <p><strong>Tổng giá:</strong> ${totalPrice} VND</p>
          <p style="color: #343a40;">Vui lòng xác nhận hoặc hủy đơn đặt phòng này.</p>
        </div>
      `
    });

    res.render('success', { bookingId: booking._id });
  } catch (error) {
    console.error('Lỗi xác nhận đặt phòng:', error);
    res.status(500).render('error', { message: `Đã xảy ra lỗi: ${error.message}. Vui lòng thử lại.` });
  }
};
// Xử lý xác nhận hoặc hủy bởi nhân viên
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId');
    if (!booking) {
      return res.status(404).render('staffs/index', {
        bookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      });
    }

    booking.status = status;
    await booking.save();

    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: booking.customerId.email,
      subject: `Đơn đặt phòng của bạn đã được ${status === 'confirmed' ? 'xác nhận' : 'hủy'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${booking.customerId.fullName},</h2>
          <p>Đơn đặt phòng của bạn đã được ${status === 'confirmed' ? 'xác nhận' : 'hủy'}.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${booking.roomId.name} (${booking.roomId.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${new Date(booking.checkin).toLocaleDateString('vi-VN')}</p>
          <p><strong>Ngày trả phòng:</strong> ${new Date(booking.checkout).toLocaleDateString('vi-VN')}</p>
          <p><strong>Số phòng:</strong> ${booking.roomCount}</p>
          <p><strong>Tổng giá:</strong> ${booking.totalPrice} VND</p>
          <p style="color: #343a40;">
            ${status === 'confirmed' ? 'Chúng tôi mong được chào đón bạn!' : 'Xin lỗi vì sự bất tiện này. Vui lòng liên hệ để được hỗ trợ.'}
          </p>
        </div>
      `
    });

    const bookings = await Booking.find()
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      bookings: formattedBookings,
      message: `Đơn đặt phòng đã được ${status === 'confirmed' ? 'xác nhận' : 'hủy'}.`,
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    res.status(500).render('staffs/index', {
      bookings: [],
      error: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    });
  }
};

// Hiển thị danh sách đơn đặt phòng
exports.showStaffBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({deleted: false})
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error('Lỗi hiển thị danh sách đơn:', error);
    res.status(500).render('staffs/index', {
      bookings: [],
      error: 'Đã xảy ra lỗi khi tải danh sách đơn. Vui lòng thử lại.',
    });
  }
};

// Hiển thị lịch sử đặt phòng
exports.showBookingHistory = async (req, res) => {
  try {
    const history = await Booking.find({deleted: false})
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedHistory = history.map(booking => ({
      _id: booking._id,
      room: {
        number: booking.roomId.name,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      history: formattedHistory,
    });
  } catch (error) {
    console.error('Lỗi hiển thị lịch sử đặt phòng:', error);
    res.status(500).render('staffs/index', {
      history: [],
      error: 'Đã xảy ra lỗi khi tải lịch sử đặt phòng. Vui lòng thử lại.',
    });
  }
};

// Hiển thị form đặt phòng tại quầy
exports.showBookAtCounter = async (req, res) => {
  try {
    const roomTypes = await RoomType.find().lean();
    console.log('RoomTypes:', roomTypes);

    if (!roomTypes || roomTypes.length === 0) {
      console.warn('Không tìm thấy roomTypes trong database.');
    }

    res.render('staffs/index', {
      bookAtCounter: true,
      roomTypes,
      formData: {},
     
    });
  } catch (error) {
    console.error('Lỗi hiển thị form đặt phòng tại quầy:', error);
    res.status(500).render('staffs/index', {
      bookAtCounter: true,
      roomTypes: [],
      formData: {},
      error: 'Lỗi khi tải form đặt phòng. Vui lòng thử lại.',
     
    });
  }
};

// Xử lý đặt phòng tại quầy
exports.handleBookAtCounter = async (req, res) => {
  try {
    const { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice } = req.body;

    console.log('Dữ liệu form:', { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice });

    if (!roomId || !fullName || !email || !phone || !checkin || !checkout || !roomCount || !adults || !totalPrice) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        roomTypes,
        formData: req.body,
        error: 'Vui lòng cung cấp đầy đủ thông tin.',
       
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);

    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        roomTypes,
        formData: req.body,
        error: 'Ngày nhận/trả phòng không hợp lệ.',
       
      });
    }

    const room = await Room.findById(roomId).populate('typeId');
    if (!room) {
      const roomTypes = await RoomType.find().lean();
      return res.status(404).render('staffs/index', {
        bookAtCounter: true,
        roomTypes,
        formData: req.body,
        error: 'Không tìm thấy phòng.',
       
      });
    }

    // Kiểm tra xung đột
    const conflictingBookings = await Booking.find({
      roomId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    console.log('Xung đột:', conflictingBookings.map(b => ({
      _id: b._id,
      checkin: new Date(b.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(b.checkout).toLocaleDateString('vi-VN'),
      roomCount: b.roomCount,
    })));

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.initialRemaining - bookedCount;

    console.log('Phòng trống:', { initialRemaining: room.initialRemaining, bookedCount, availableCount });

    if (availableCount < roomCountNum) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        roomTypes,
        formData: req.body,
        error: `Không đủ phòng trống. Yêu cầu ${roomCountNum} phòng, chỉ còn ${availableCount}.`,
       
      });
    }

    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({ fullName, email, phone, address, idNumber });
      await customer.save();
      console.log('Tạo khách hàng:', customer._id);
    } else {
      customer.fullName = fullName;
      customer.phone = phone;
      customer.address = address || customer.address;
      customer.idNumber = idNumber || customer.idNumber;
      await customer.save();
      console.log('Cập nhật khách hàng:', customer._id);
    }

    const days = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
    const calculatedTotalPrice = room.price * roomCountNum * days;
    if (parseFloat(totalPrice) !== calculatedTotalPrice) {
      const roomTypes = await RoomType.find().lean();
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        roomTypes,
        formData: req.body,
        error: 'Tổng giá không hợp lệ.',
       
      });
    }

    const booking = new Booking({
      roomId,
      customerId: customer._id,
      checkin,
      checkout,
      roomCount: roomCountNum,
      adults: parseInt(adults),
      children: parseInt(children || 0),
      totalPrice: parseFloat(totalPrice),
      status: 'confirmed',
      userId: req.user.id,
    });

    await booking.save();
    console.log('Booking saved:', booking._id);
    await Room.updateRemainingOnBooking(booking);

    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: email,
      subject: 'Xác nhận đặt phòng tại quầy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${fullName},</h2>
          <p>Cảm ơn bạn đã đặt phòng tại Resort Biển 5 Sao. Đơn đặt phòng của bạn đã được xác nhận.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${room.name} (${room.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${checkin}</p>
          <p><strong>Ngày trả phòng:</strong> ${checkout}</p>
          <p><strong>Số phòng:</strong> ${roomCount}</p>
          <p><strong>Tổng giá:</strong> ${totalPrice} VND</p>
          <p><strong>Thông tin khách hàng:</strong></p>
          <p>Họ tên: ${fullName}</p>
          <p>Email: ${email}</p>
          <p>Số điện thoại: ${phone}</p>
          <p>Địa chỉ: ${address || 'Không cung cấp'}</p>
          <p>CMND/CCCD: ${idNumber || 'Không cung cấp'}</p>
          <p style="color: #343a40;">Chúng tôi mong được chào đón bạn!</p>
        </div>
      `,
    });

    res.render('staffs/index', {
      message: `Đặt phòng thành công! Mã đơn: ${booking._id}`,
      bookAtCounter: true,
    });
  } catch (error) {
    console.error('Lỗi đặt phòng tại quầy:', error);
    const roomTypes = await RoomType.find().lean();
    res.status(500).render('staffs/index', {
      bookAtCounter: true,
      roomTypes,
      formData: req.body,
      error: `Lỗi: ${error.message}.`,
     
    });
  }
};


// Lấy giá phòng
exports.getRoomPrice = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId).lean();
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    }
    res.json({ price: room.price });
  } catch (error) {
    console.error('Lỗi lấy giá phòng:', error);
    res.status(500).json({ message: 'Lỗi khi lấy giá phòng.' });
  }
};
exports.searchAvailableRoomsForStaff = async (req, res) => {
  try {
    const { checkin, checkout, roomCount, adults, typeId } = req.query;

    console.log('Dữ liệu tìm kiếm (nhân viên):', { checkin, checkout, roomCount, adults, typeId });

    // Kiểm tra input
    if (!checkin || !checkout || !roomCount || !adults) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ ngày nhận phòng, trả phòng, số phòng và số người lớn.' });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);
    const adultsNum = parseInt(adults);

    // Validate ngày và số lượng
    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      return res.status(400).json({ error: 'Ngày nhận phòng phải trước ngày trả phòng.' });
    }
    if (roomCountNum < 1 || adultsNum < 1) {
      return res.status(400).json({ error: 'Số phòng và số người lớn phải lớn hơn 0.' });
    }

    // Lấy roomTypes
    const roomTypes = await RoomType.find().lean();
    const query = typeId ? { typeId, deleted: false } : { deleted: false };
    const allRooms = await Room.find(query).populate('typeId').lean();

    // Lấy bookings có khả năng xung đột
    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    console.log('Bookings tìm thấy (nhân viên):', bookings.map(b => ({
      _id: b._id,
      roomId: b.roomId,
      checkin: new Date(b.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(b.checkout).toLocaleDateString('vi-VN'),
      roomCount: b.roomCount,
      status: b.status,
    })));

    // Khôi phục remaining
    for (const room of allRooms) {
      await Room.restoreRemaining(room._id, new Date());
    }

    // Tính phòng trống
    const availableRooms = allRooms
      .map(room => {
        const conflictingBookings = bookings.filter(
          booking =>
            booking.roomId.toString() === room._id.toString() &&
            new Date(booking.checkin) <= checkoutDate &&
            new Date(booking.checkout) >= checkinDate
        );

        console.log(`Phòng ${room._id} - Đơn xung đột (nhân viên):`, conflictingBookings.map(b => ({
          _id: b._id,
          checkin: new Date(b.checkin).toLocaleDateString('vi-VN'),
          checkout: new Date(b.checkout).toLocaleDateString('vi-VN'),
          roomCount: b.roomCount,
        })));

        const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
        const availableCount = room.initialRemaining - bookedCount;

        console.log(`Phòng ${room._id} - Tính toán (nhân viên):`, {
          initialRemaining: room.initialRemaining,
          bookedCount,
          availableCount,
        });

        return { ...room, availableCount };
      })
      .filter(room => room.availableCount >= roomCountNum);

    console.log('Phòng trống (nhân viên):', availableRooms.map(r => ({
      _id: r._id,
      name: r.name,
      availableCount: r.availableCount,
    })));

    if (availableRooms.length === 0) {
      return res.status(200).json({ rooms: [], error: 'Không tìm thấy phòng trống phù hợp.' });
    }

    res.status(200).json({ rooms: availableRooms, roomTypes });
  } catch (error) {
    console.error('Lỗi tìm kiếm phòng (nhân viên):', error);
    res.status(500).json({ error: 'Lỗi server khi tìm kiếm phòng.' });
  }
};

// Hiển thị form chỉnh sửa đơn đặt phòng
exports.editBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    if (!booking) {
      return res.status(404).render('staffs/index', {
        bookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      
      });
    }

    res.render('staffs/index', {
      editBooking: true,
      booking: {
        ...booking,
        checkin: new Date(booking.checkin).toISOString().split('T')[0],
        checkout: new Date(booking.checkout).toISOString().split('T')[0]
      },
      customer: {
        fullName: booking.customerId.fullName,
        email: booking.customerId.email,
        phone: booking.customerId.phone,
        address: booking.customerId.address,
        idNumber: booking.customerId.idNumber
      }
    
    });
  } catch (error) {
    console.error('Lỗi hiển thị form chỉnh sửa:', error);
    res.status(500).render('staffs/index', {
      bookings: [],
      error: 'Lỗi khi tải form chỉnh sửa. Vui lòng thử lại.',
    
    });
  }
};

// Cập nhật đơn đặt phòng
exports.updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      roomId, checkin, checkout, roomCount, adults, children, totalPrice,
      fullName, email, phone, address, idNumber
    } = req.body;

    console.log('Dữ liệu cập nhật:', {
      bookingId, roomId, checkin, checkout, roomCount, adults, children, totalPrice,
      fullName, email, phone, address, idNumber
    });

        

    // Validate dữ liệu đầu vào cho đặt phòng
    if (!roomId || !checkin || !checkout || !roomCount || !adults || !totalPrice) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Vui lòng cung cấp đầy đủ thông tin đặt phòng.',
      
      });
    }

    // Validate dữ liệu đầu vào cho khách hàng
    if (!fullName || !email || !phone) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Vui lòng cung cấp đầy đủ thông tin khách hàng (họ tên, email, số điện thoại).',
      
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);
    const adultsNum = parseInt(adults);
    const childrenNum = parseInt(children || 0);

    // Kiểm tra ngày hợp lệ
    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Ngày nhận phòng và trả phòng không hợp lệ.',
      
      });
    }

    // Kiểm tra số lượng hợp lệ
    if (roomCountNum < 1 || adultsNum < 1) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Số phòng và số người lớn phải lớn hơn 0.',
      
      });
    }

    // Tìm phòng
    const room = await Room.findById(roomId).populate('typeId').lean();
    if (!room) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(404).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Không tìm thấy phòng.',
      
      });
    }

    // Kiểm tra phòng trống (loại trừ đơn hiện tại)
    const conflictingBookings = await Booking.find({
      roomId,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: bookingId },
      deleted: false,
      $or: [
        { checkin: { $lte: checkoutDate, $gte: checkinDate } },
        { checkout: { $gte: checkinDate, $lte: checkoutDate } },
        { checkin: { $lte: checkinDate }, checkout: { $gte: checkoutDate } },
      ],
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.initialRemaining - bookedCount;

    if (availableCount < roomCountNum) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: `Không đủ phòng trống. Yêu cầu ${roomCountNum} phòng, chỉ còn ${availableCount}.`,
      
      });
    }

    // Kiểm tra tổng giá
    const days = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
    const calculatedTotalPrice = room.price * roomCountNum * days;
    if (parseFloat(totalPrice) !== calculatedTotalPrice) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'roomId',
          populate: { path: 'typeId' }
        })
        .populate('customerId')
        .lean();
      return res.status(400).render('staffs/index', {
        editBooking: true,
        booking: {
          ...booking,
          checkin: new Date(booking.checkin).toISOString().split('T')[0],
          checkout: new Date(booking.checkout).toISOString().split('T')[0],
          customer: {
            fullName: booking.customerId.fullName,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
            address: booking.customerId.address,
            idNumber: booking.customerId.idNumber
          }
        },
        error: 'Tổng giá không hợp lệ.',
      
      });
    }

    // Tìm đơn đặt phòng
    const booking = await Booking.findById(bookingId).populate('customerId');
    if (!booking) {
      return res.status(404).render('staffs/index', {
        bookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      
      });
    }

    // Cập nhật thông tin đặt phòng
    booking.roomId = roomId;
    booking.checkin = checkinDate;
    booking.checkout = checkoutDate;
    booking.roomCount = roomCountNum;
    booking.adults = adultsNum;
    booking.children = childrenNum;
    booking.totalPrice = parseFloat(totalPrice);
    await booking.save();

    // Cập nhật thông tin khách hàng
    const customer = await Customer.findById(booking.customerId._id);
    if (!customer) {
      return res.status(404).render('staffs/index', {
        bookings: [],
        error: 'Không tìm thấy khách hàng.',
      
      });
    }

    customer.fullName = fullName;
    customer.email = email;
    customer.phone = phone;
    customer.address = address || '';
    customer.idNumber = idNumber || '';
    await customer.save();

    // Gửi email thông báo cập nhật
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: customer.email,
      subject: 'Cập nhật đơn đặt phòng và thông tin cá nhân',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${customer.fullName},</h2>
          <p>Đơn đặt phòng và thông tin cá nhân của bạn đã được cập nhật thành công.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${room.name} (${room.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${new Date(booking.checkin).toLocaleDateString('vi-VN')}</p>
          <p><strong>Ngày trả phòng:</strong> ${new Date(booking.checkout).toLocaleDateString('vi-VN')}</p>
          <p><strong>Số phòng:</strong> ${booking.roomCount}</p>
          <p><strong>Số người lớn:</strong> ${booking.adults}</p>
          <p><strong>Số trẻ em:</strong> ${booking.children}</p>
          <p><strong>Tổng giá:</strong> ${booking.totalPrice} VND</p>
          <h3 style="color: #343a40;">Thông tin cá nhân:</h3>
          <p><strong>Họ và tên:</strong> ${customer.fullName}</p>
          <p><strong>Email:</strong> ${customer.email}</p>
          <p><strong>Số điện thoại:</strong> ${customer.phone}</p>
          <p><strong>Địa chỉ:</strong> ${customer.address || 'Không có'}</p>
          <p><strong>CMND/CCCD:</strong> ${customer.idNumber || 'Không có'}</p>
          <p style="color: #343a40;">Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
        </div>
      `
    });

    // Lấy danh sách đơn đặt phòng để hiển thị lại
    const bookings = await Booking.find({ deleted: false })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      bookings: formattedBookings,
      message: 'Cập nhật đơn đặt phòng và thông tin khách hàng thành công!',
      ebooking: true,
    });
  } catch (error) {
    console.error('Lỗi cập nhật đơn đặt phòng:', error);
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();
    res.status(500).render('staffs/index', {
      editBooking: true,
      booking: booking ? {
        ...booking,
        checkin: new Date(booking.checkin).toISOString().split('T')[0],
        checkout: new Date(booking.checkout).toISOString().split('T')[0],
        customer: {
          fullName: booking.customerId.fullName,
          email: booking.customerId.email,
          phone: booking.customerId.phone,
          address: booking.customerId.address,
          idNumber: booking.customerId.idNumber
        }
      } : null,
      error: 'Lỗi khi cập nhật đơn đặt phòng. Vui lòng thử lại.',
    
    });
  }
};



// Xóa mềm đơn đặt phòng
exports.deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Tìm đơn đặt phòng
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId');
    if (!booking) {
      return res.status(404).render('staffs/index', {
        bookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      
      });
    }

    // Đánh dấu xóa mềm
    booking.deleted = true;
    await booking.save();

    // Cập nhật số lượng phòng còn lại
    await Room.restoreRemaining(booking.roomId._id, new Date());

    // Gửi email thông báo
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: booking.customerId.email,
      subject: 'Hủy đơn đặt phòng',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${booking.customerId.fullName},</h2>
          <p>Đơn đặt phòng của bạn đã được hủy.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${booking.roomId.name} (${booking.roomId.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${new Date(booking.checkin).toLocaleDateString('vi-VN')}</p>
          <p><strong>Ngày trả phòng:</strong> ${new Date(booking.checkout).toLocaleDateString('vi-VN')}</p>
          <p><strong>Tổng giá:</strong> ${booking.totalPrice} VND</p>
          <p style="color: #343a40;">Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
        </div>
      `
    });

    // Lấy danh sách đơn đặt phòng mới
    const bookings = await Booking.find({ deleted: false })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));
    console.log('Bookings sau khi xóa mềm:', formattedBookings);

    res.render('staffs/index', {
      bookings: formattedBookings,
      message: 'Đã chuyển đơn đặt phòng vào thùng rác!',
    
    });
  } catch (error) {
    console.error('Lỗi xóa mềm đơn đặt phòng:', error);
    res.status(500).render('staffs/index', {
      bookings: [],
      error: 'Lỗi khi xóa đơn đặt phòng. Vui lòng thử lại.',
    
    });
  }
};

// Hiển thị trang thùng rác
exports.showTrash = async (req, res) => {
  try {
    const bookings = await Booking.find({ deleted: true })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      trash: true,
      trashBookings: formattedBookings,
    
    });
  } catch (error) {
    console.error('Lỗi hiển thị thùng rác:', error);
    res.status(500).render('staffs/index', {
      trash: true,
      trashBookings: [],
      error: 'Lỗi khi tải thùng rác. Vui lòng thử lại.',
    
    });
  }
};

// Khôi phục đơn đặt phòng
exports.restoreBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId');
    if (!booking) {
      return res.status(404).render('staffs/index', {
        trash: true,
        trashBookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      
      });
    }

    // Kiểm tra phòng trống
    const conflictingBookings = await Booking.find({
      roomId: booking.roomId._id,
      status: { $in: ['pending', 'confirmed'] },
      deleted: false,
      $or: [
        { checkin: { $lte: booking.checkout, $gte: booking.checkin } },
        { checkout: { $gte: booking.checkin, $lte: booking.checkout } },
        { checkin: { $lte: booking.checkin }, checkout: { $gte: booking.checkout } },
      ],
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, b) => sum + b.roomCount, 0);
    const availableCount = booking.roomId.initialRemaining - bookedCount;

    if (availableCount < booking.roomCount) {
      return res.status(400).render('staffs/index', {
        trash: true,
        trashBookings: [],
        error: `Không thể khôi phục: Chỉ còn ${availableCount} phòng trống, cần ${booking.roomCount} phòng.`,
      
      });
    }

    // Khôi phục đơn
    booking.deleted = false;
    await booking.save();

    // Gửi email thông báo
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: booking.customerId.email,
      subject: 'Khôi phục đơn đặt phòng',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${booking.customerId.fullName},</h2>
          <p>Đơn đặt phòng của bạn đã được khôi phục.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${booking.roomId.name} (${booking.roomId.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${new Date(booking.checkin).toLocaleDateString('vi-VN')}</p>
          <p><strong>Ngày trả phòng:</strong> ${new Date(booking.checkout).toLocaleDateString('vi-VN')}</p>
          <p><strong>Tổng giá:</strong> ${booking.totalPrice} VND</p>
          <p style="color: #343a40;">Chúng tôi mong được chào đón bạn!</p>
        </div>
      `
    });

    // Lấy danh sách đơn trong thùng rác
    const bookings = await Booking.find({ deleted: true })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      trash: true,
      trashBookings: formattedBookings,
      message: 'Khôi phục đơn đặt phòng thành công!',
    
    });
  } catch (error) {
    console.error('Lỗi khôi phục đơn đặt phòng:', error);
    res.status(500).render('staffs/index', {
      trash: true,
      trashBookings: [],
      error: 'Lỗi khi khôi phục đơn đặt phòng. Vui lòng thử lại.',
    
    });
  }
};

// Xóa vĩnh viễn đơn đặt phòng
exports.forceDeleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId');
    if (!booking) {
      return res.status(404).render('staffs/index', {
        trash: true,
        trashBookings: [],
        error: 'Không tìm thấy đơn đặt phòng.',
      
      });
    }

    // Xóa vĩnh viễn
    await Booking.deleteOne({ _id: bookingId });

    // Gửi email thông báo
    await transporter.sendMail({
      from: 'Resort Biển 5 Sao <ptuan7205@gmail.com>',
      to: booking.customerId.email,
      subject: 'Xóa vĩnh viễn đơn đặt phòng',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <h2 style="color: #007bff;">Xin chào ${booking.customerId.fullName},</h2>
          <p>Đơn đặt phòng của bạn đã được xóa vĩnh viễn khỏi hệ thống.</p>
          <h3 style="color: #343a40;">Thông tin đặt phòng:</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking._id}</p>
          <p><strong>Phòng:</strong> ${booking.roomId.name} (${booking.roomId.typeId.name || 'Không xác định'})</p>
          <p><strong>Ngày nhận phòng:</strong> ${new Date(booking.checkin).toLocaleDateString('vi-VN')}</p>
          <p><strong>Ngày trả phòng:</strong> ${new Date(booking.checkout).toLocaleDateString('vi-VN')}</p>
          <p><strong>Tổng giá:</strong> ${booking.totalPrice} VND</p>
          <p style="color: #343a40;">Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
        </div>
      `
    });

    // Lấy danh sách đơn trong thùng rác
    const bookings = await Booking.find({ deleted: true })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' }
      })
      .populate('customerId')
      .lean();

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      room: {
        name: booking.roomId.name || null,
        type: booking.roomId.typeId.name || 'Không xác định'
      },
      customer: {
        fullName: booking.customerId.fullName
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status
    }));

    res.render('staffs/index', {
      trash: true,
      trashBookings: formattedBookings,
      message: 'Xóa vĩnh viễn đơn đặt phòng thành công!',
    
    });
  } catch (error) {
    console.error('Lỗi xóa vĩnh viễn đơn đặt phòng:', error);
    res.status(500).render('staffs/index', {
      trash: true,
      trashBookings: [],
      error: 'Lỗi khi xóa vĩnh viễn đơn đặt phòng. Vui lòng thử lại.',
    
    });
  }
};

// Tìm kiếm đơn đặt phòng
exports.searchBookings = async (req, res) => {
  try {
    const { email, checkin, checkout, createdAt } = req.query;
    console.log('Dữ liệu tìm kiếm:', req.query);

    // Kiểm tra xem có ít nhất một tiêu chí tìm kiếm
    if (!email && !checkin && !checkout && !createdAt) {
      return res.render('staffs/index', {
        bookings: [],
        formattedBookings: [],
        searchParams: req.query,
        error: 'Vui lòng cung cấp ít nhất một tiêu chí tìm kiếm.',
      });
    }

    // Xây dựng mảng các điều kiện cho toán tử $or
    const orConditions = [];

    // Xử lý tìm kiếm theo email
    if (email) {
      const customer = await Customer.findOne({ email: { $regex: email, $options: 'i' } }).lean();
      if (customer) {
        orConditions.push({ customerId: customer._id });
      }
    }

    // Xử lý tìm kiếm theo checkin
    if (checkin) {
      orConditions.push({ checkin: { $gte: new Date(checkin) } });
    }

    // Xử lý tìm kiếm theo checkout
    if (checkout) {
      orConditions.push({ checkout: { $lte: new Date(checkout) } });
    }

    // Xử lý tìm kiếm theo createdAt
    if (createdAt) {
      const startOfDay = new Date(createdAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(createdAt);
      endOfDay.setHours(23, 59, 59, 999);
      orConditions.push({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
    }

    // Nếu không có điều kiện nào được thêm vào (ví dụ: email không tìm thấy và không có tiêu chí khác)
    if (orConditions.length === 0) {
      return res.render('staffs/index', {
        bookings: [],
        formattedBookings: [],
        searchParams: req.query,
        error: 'Không tìm thấy đơn đặt phòng phù hợp.',
      });
    }

    // Tìm kiếm đơn đặt phòng với toán tử $or
    const bookings = await Booking.find({ $or: orConditions })
      .populate({
        path: 'roomId',
        populate: { path: 'typeId' },
      })
      .populate('customerId')
      .lean();
    console.log('Kết quả tìm kiếm:', bookings.length);

    // Format dữ liệu
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      room: {
        name: booking.roomId?.name || 'Không xác định',
        type: booking.roomId?.typeId?.name || 'Không xác định',
      },
      customer: {
        fullName: booking.customerId?.fullName || 'Không xác định',
      },
      checkin: new Date(booking.checkin).toLocaleDateString('vi-VN'),
      checkout: new Date(booking.checkout).toLocaleDateString('vi-VN'),
      totalPrice: booking.totalPrice,
      status: booking.status,
    }));

    if (bookings.length === 0) {
      return res.render('staffs/index', {
        bookings: [],
        formattedBookings: [],
        searchParams: req.query,
        error: 'Không tìm thấy đơn đặt phòng phù hợp.',
      });
    }

    console.log('Dữ liệu truyền vào template:', formattedBookings);
    res.render('staffs/index', {
      bookings: formattedBookings,
      formattedBookings: formattedBookings,
      searchParams: req.query,
      message: 'Kết quả tìm kiếm đơn đặt phòng.',
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm đơn đặt phòng:', error);
    res.status(500).render('staffs/index', {
      bookings: [],
      formattedBookings: [],
      searchParams: req.query,
      error: 'Lỗi khi tìm kiếm đơn đặt phòng. Vui lòng thử lại.',
    });
  }
};