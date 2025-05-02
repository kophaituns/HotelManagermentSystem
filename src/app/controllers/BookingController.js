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

    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lt: checkoutDate } },
        { checkout: { $gt: checkinDate } }
      ]
    }).lean();

    const availableRooms = allRooms.map(room => {
      const conflictingBookings = bookings.filter(booking => 
        booking.roomId.toString() === room._id.toString()
      );
      const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
      const availableCount = room.remaining - bookedCount;
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

    const bookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lte: end } },
        { checkout: { $gte: start } }
      ]
    }).sort({ checkin: 1 }).lean();

    const availability = [];
    let current = new Date(start);
    let remainingRooms = room.remaining;

    if (bookings.length === 0) {
      availability.push({
        start: current.toLocaleDateString('vi-VN'),
        end: new Date(end).toLocaleDateString('vi-VN'),
        availableCount: remainingRooms
      });
    } else {
      for (const booking of bookings) {
        const bookingCheckin = new Date(booking.checkin);
        const bookingCheckout = new Date(booking.checkout);

        if (current < bookingCheckin) {
          availability.push({
            start: current.toLocaleDateString('vi-VN'),
            end: bookingCheckin.toLocaleDateString('vi-VN'),
            availableCount: remainingRooms
          });
        }

        const bookedCount = bookings
          .filter(b => b._id.toString() !== booking._id.toString() && new Date(b.checkin) <= bookingCheckout && new Date(b.checkout) >= bookingCheckin)
          .reduce((sum, b) => sum + b.roomCount, booking.roomCount);

        const availableCount = room.remaining - bookedCount;
        if (availableCount > 0) {
          availability.push({
            start: bookingCheckin.toLocaleDateString('vi-VN'),
            end: bookingCheckout.toLocaleDateString('vi-VN'),
            availableCount
          });
        }

        current = bookingCheckout > current ? bookingCheckout : current;
      }

      if (current < end) {
        availability.push({
          start: current.toLocaleDateString('vi-VN'),
          end: new Date(end).toLocaleDateString('vi-VN'),
          availableCount: remainingRooms
        });
      }
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
      return res.status(404).render('error', { message: 'Không tìm thấy phòng.',  });
    }

    const conflictingBookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lt: checkoutDate } },
        { checkout: { $gt: checkinDate } }
      ]
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.remaining - bookedCount;

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
    res.status(500).render('error', { message: 'Đã xảy ra lỗi. Vui lòng thử lại.',  });
  }
};

// Xử lý xác nhận đặt phòng
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice } = req.body;

    if (!fullName || !email || !phone || !checkin || !checkout || !roomCount || !adults || !totalPrice) {
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
      return res.status(404).render('error', { message: 'Không tìm thấy phòng.',  });
    }

    const conflictingBookings = await Booking.find({
      roomId: id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lt: checkoutDate } },
        { checkout: { $gt: checkinDate } }
      ]
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.remaining - bookedCount;

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

    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({ fullName, email, phone, address, idNumber });
      await customer.save();
    } else {
      customer.fullName = fullName;
      customer.phone = phone;
      customer.address = address || customer.address;
      customer.idNumber = idNumber || customer.idNumber;
      await customer.save();
    }

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

    const booking = new Booking({
      roomId: id,
      customerId: customer._id,
      checkin,
      checkout,
      roomCount: roomCountNum,
      adults,
      children,
      totalPrice,
      status: 'pending'
    });

    await booking.save();
    await Room.updateRemainingOnBooking(booking);
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
          <p><strong>Thông tin khách hàng:</strong></p>
          <p>Họ tên: ${fullName}</p>
          <p>Email: ${email}</p>
          <p>Số điện thoại: ${phone}</p>
          <p>Địa chỉ: ${address || 'Không cung cấp'}</p>
          <p>CMND/CCCD: ${idNumber || 'Không cung cấp'}</p>
          <p style="color: #343a40;">Chúng tôi sẽ thông báo khi đặt phòng được xác nhận hoặc hủy.</p>
        </div>
      `
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

    res.render('success', { bookingId: booking._id,  });
  } catch (error) {
    console.error('Lỗi xác nhận đặt phòng:', error);
    res.status(500).render('error', { message: `Đã xảy ra lỗi: ${error.message}. Vui lòng thử lại.`,  });
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
    const history = await Booking.find()
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
    const availableRooms = await Room.find().populate('typeId').lean();
    const today = new Date();
    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      checkout: { $gt: today }
    }).lean();

    const availableRoomsFiltered = availableRooms.map(room => {
      const conflictingBookings = bookings.filter(booking => 
        booking.roomId.toString() === room._id.toString()
      );
      const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
      const availableCount = room.remaining - bookedCount;
      return { ...room, availableCount };
    }).filter(room => room.availableCount > 0);

    res.render('staffs/index', {
      bookAtCounter: true,
      availableRooms: availableRoomsFiltered,
      formData: {},
      user: { name: 'Admin', role: true }, // Mock user data
      
    });
  } catch (error) {
    console.error('Lỗi hiển thị form đặt phòng tại quầy:', error);
    res.status(500).render('staffs/index', {
      bookAtCounter: true,
      availableRooms: [],
      formData: {},
      error: 'Đã xảy ra lỗi khi tải form đặt phòng. Vui lòng thử lại.',
      
    });
  }
};

// Xử lý đặt phòng tại quầy
exports.handleBookAtCounter = async (req, res) => {
  try {
    const { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice } = req.body;
    console.log('Dữ liệu form:', { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice });

    if (!roomId || !fullName || !email || !phone || !checkin || !checkout || !roomCount || !adults || !totalPrice) {
      const availableRooms = await Room.find().populate('typeId').lean();
      console.log('Thiếu thông tin, render lại form');
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        availableRooms,
        formData: { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice },
        error: 'Vui lòng cung cấp đầy đủ thông tin.',
        
      });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const roomCountNum = parseInt(roomCount);
    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkinDate >= checkoutDate) {
      const availableRooms = await Room.find().populate('typeId').lean();
      console.log('Ngày không hợp lệ');
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        availableRooms,
        formData: { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice },
        error: 'Ngày nhận phòng và trả phòng không hợp lệ.',
        
      });
    }

    const room = await Room.findById(roomId).populate('typeId');
    if (!room) {
      const availableRooms = await Room.find().populate('typeId').lean();
      console.log('Không tìm thấy phòng');
      return res.status(404).render('staffs/index', {
        bookAtCounter: true,
        availableRooms,
        formData: { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice },
        error: 'Không tìm thấy phòng.',
        
      });
    }

    const conflictingBookings = await Booking.find({
      roomId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkin: { $lt: checkoutDate } },
        { checkout: { $gt: checkinDate } }
      ]
    }).lean();

    const bookedCount = conflictingBookings.reduce((sum, booking) => sum + booking.roomCount, 0);
    const availableCount = room.remaining - bookedCount;

    if (availableCount < roomCountNum) {
      const availableRooms = await Room.find().populate('typeId').lean();
      console.log('Không đủ phòng trống');
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        availableRooms,
        formData: { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice },
        error: `Không đủ phòng trống. Yêu cầu ${roomCountNum} phòng, nhưng chỉ còn ${availableCount} phòng.`,
        
      });
    }

    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({ fullName, email, phone, address, idNumber });
      await customer.save();
      console.log('Tạo mới khách hàng:', customer._id);
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
      const availableRooms = await Room.find().populate('typeId').lean();
      console.log('Tổng giá không hợp lệ');
      return res.status(400).render('staffs/index', {
        bookAtCounter: true,
        availableRooms,
        formData: { roomId, fullName, email, phone, address, idNumber, checkin, checkout, roomCount, adults, children, totalPrice },
        error: 'Tổng giá không hợp lệ. Vui lòng kiểm tra lại.',
        
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
      status: 'confirmed'
    });

    await booking.save();
    console.log('Tạo booking thành công:', booking._id);
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
      `
    });
    console.log('Gửi email xác nhận thành công:', email);

    res.render('staffs/index', {
      message: `Đặt phòng thành công! Mã đơn: ${booking._id}`,
      
    });
  } catch (error) {
    console.error('Lỗi đặt phòng tại quầy:', error);
    const availableRooms = await Room.find().populate('typeId').lean();
    res.status(500).render('staffs/index', {
      bookAtCounter: true,
      availableRooms,
      formData: req.body,
      error: `Đã xảy ra lỗi: ${error.message}. Vui lòng thử lại.`,
      
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