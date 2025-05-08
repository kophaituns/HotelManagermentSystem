const User = require('../../model/User');
const { mutipleMongooseToObject, mongooseToObject } = require('../../../util/mongoose');
const bcrypt = require('bcrypt');
const Booking = require('../../model/Booking');

const AdminController = {

  // Hiển thị trang chính của admin
  index: (req, res) => {
    res.render('admins/index', {
      title: 'Admin Dashboard',
      
    });
  },

  // Lấy danh sách người dùng (phân trang)
  getEmployee: async (req, res) => {
    try {
      const searchQuery = req.query.name || '';
      let usersQuery = { deleted: false }; // Chỉ lấy người dùng chưa bị xóa

      if (searchQuery) {
        // Tìm kiếm theo tên (case-insensitive)
        usersQuery.name = { $regex: new RegExp(searchQuery, 'i') };
      }

      const [users, deletedCount] = await Promise.all([
        User.find(usersQuery),
        User.countDocumentsDeleted()
      ]);

      res.render('admins/employee', {
        users: mutipleMongooseToObject(users),
        deletedCount,
        searchQuery: { name: searchQuery },
        message: req.query.message,
        error: req.query.error,
        // user: req.user
    });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách nhân viên:', error);
      res.status(500).render('admins/employee', {
        users: [],
        deletedCount: 0,
        searchQuery: { name: req.query.name || '' },
        error: 'Đã xảy ra lỗi khi tải danh sách nhân viên. Vui lòng thử lại.',
        user: req.user
      });
    }
  },

  // Tạo người dùng mới
  createEmployee: (req, res) => {
    res.render('admins/create', {
      title: 'Thêm nhân viên',
      formData: {},
      error: null,
      
    });
  },

  // Lưu thông tin người dùng mới
  storeEmployee: async (req, res) => {
    try {
      const { username, password, isAdmin, name, email, dob, phone, role } = req.body;

      // Validation
      if (!username || !password || !name || !email) {
        return res.status(400).render('admins/create', {
          title: 'Thêm nhân viên',
          error: 'Vui lòng cung cấp đầy đủ username, password, tên và email.',
          formData: req.body,
          
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).render('admins/create', {
          title: 'Thêm nhân viên',
          error: 'Email không hợp lệ.',
          formData: req.body,
          
        });
      }
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).render('admins/create', {
          title: 'Thêm nhân viên',
          error: 'Username hoặc email đã tồn tại.',
          formData: req.body,
          
        });
      }
      if (password.length < 6) {
        return res.status(400).render('admins/create', {
          title: 'Thêm nhân viên',
          error: 'Mật khẩu phải có ít nhất 6 ký tự.',
          formData: req.body,
          
        });
      }

      // Mã hóa mật khẩu
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Xử lý ảnh
      const avatar = req.file?.path || '/images/default-avatar.jpg';

      // Đồng bộ role với isAdmin


      const user = new User({
        username,
        passwordHash,
        isAdmin,
        name,
        email,
        dob: dob ? new Date(dob) : null,
        phone,
        role,
        avatar
      });

      await user.save();
      res.redirect('/admin/employee?message=Thêm nhân viên thành công');
    } catch (error) {
      console.error('Lỗi khi tạo nhân viên:', error);
      res.status(500).render('admins/create', {
        title: 'Thêm nhân viên',
        error: 'Đã xảy ra lỗi khi tạo nhân viên. Vui lòng thử lại.',
        formData: req.body,
        
      });
    }
  },

  // Hiển thị thông tin người dùng
  // 
  
  showEmployee: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).render('admins/show', {
          title: 'Thông tin nhân viên',
          error: 'Nhân viên không tồn tại.',
          user: null,
          message: req.query.message || null,
        });
      }
      res.render('admins/show', {
        title: 'Thông tin nhân viên',
        user: mongooseToObject(user),
        message: req.query.message || null,
        error: req.query.error || null,
      });
    } catch (error) {
      console.error('Lỗi khi tìm nhân viên:', error);
      res.status(500).render('admins/show', {
        title: 'Thông tin nhân viên',
        error: 'Đã xảy ra lỗi khi tải thông tin nhân viên. Vui lòng thử lại.',
        user: null,
        message: null,
      });
    }
  },
  // Chỉnh sửa thông tin người dùng
  editEmployee: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).render('admins/edit', {
          title: 'Chỉnh sửa nhân viên',
          error: 'Nhân viên không tồn tại.',
          
        });
      }
      res.render('admins/edit', {
        title: 'Chỉnh sửa nhân viên',
        user: mongooseToObject(user),
        formData: mongooseToObject(user),
        
      });
    } catch (error) {
      console.error('Lỗi khi tìm nhân viên:', error);
      res.status(500).render('admins/edit', {
        title: 'Chỉnh sửa nhân viên',
        error: 'Đã xảy ra lỗi khi tải form chỉnh sửa. Vui lòng thử lại.',
        
      });
    }
  },

  // Cập nhật thông tin người dùng
  updateEmployee: async (req, res) => {
    try {
      const { username, isAdmin, name, email, dob, phone, role } = req.body;

      // Validation
      if (!username || !name || !email) {
        return res.status(400).render('admins/edit', {
          title: 'Chỉnh sửa nhân viên',
          error: 'Vui lòng cung cấp đầy đủ username, tên và email.',
          formData: req.body,
          user: await User.findById(req.params.id),
          
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).render('admins/edit', {
          title: 'Chỉnh sửa nhân viên',
          error: 'Email không hợp lệ.',
          formData: req.body,
          user: await User.findById(req.params.id),
          
        });
      }
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).render('admins/edit', {
          title: 'Chỉnh sửa nhân viên',
          error: 'Username hoặc email đã tồn tại.',
          formData: req.body,
          user: await User.findById(req.params.id),
          
        });
      }

      // Xử lý ảnh
      const avatar = req.file?.path || req.body.existingAvatar || '/images/default-avatar.jpg';

    
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          username,
          isAdmin: isAdmin === 'true',
          name,
          email,
          dob: dob ? new Date(dob) : null,
          phone,
          role,
          avatar
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).render('admins/edit', {
          title: 'Chỉnh sửa nhân viên',
          error: 'Nhân viên không tồn tại.',
          formData: req.body,
          
        });
      }

      res.redirect('/admin/employee?message=Cập nhật nhân viên thành công');
    } catch (error) {
      console.error('Lỗi khi cập nhật nhân viên:', error);
      res.status(500).render('admins/edit', {
        title: 'Chỉnh sửa nhân viên',
        error: 'Đã xảy ra lỗi khi cập nhật nhân viên. Vui lòng thử lại.',
        formData: req.body,
        user: await User.findById(req.params.id),
        
      });
    }
  },

  // Xóa người dùng (xóa mềm)
  deleteEmployee: async (req, res) => {
    try {
      const user = await User.delete({ _id: req.params.id });
      if (!user) {
        return res.status(404).render('admins/employee', {
          title: 'Danh sách nhân viên',
          users: await User.find({ deleted: false }),
          deletedCount: await User.countDocumentsDeleted(),
          error: 'Nhân viên không tồn tại.',
          
        });
      }
      res.redirect('/admin/employee?message=Xóa nhân viên thành công');
    } catch (error) {
      console.error('Lỗi khi xóa nhân viên:', error);
      res.status(500).render('admins/employee', {
        title: 'Danh sách nhân viên',
        users: await User.find({ deleted: false }),
        deletedCount: await User.countDocumentsDeleted(),
        error: 'Đã xảy ra lỗi khi xóa nhân viên. Vui lòng thử lại.',
        
      });
    }
  },

  // Hiển thị danh sách người dùng đã xóa
  trashEmployee: async (req, res) => {
    try {
      const users = await User.findWithDeleted({ deleted: true });
      res.render('admins/trash', {
        title: 'Thùng rác nhân viên',
        users: mutipleMongooseToObject(users),
        message: req.query.message,
        error: req.query.error,
        
      });
    } catch (error) {
      console.error('Lỗi khi tải thùng rác:', error);
      res.status(500).render('admins/trash', {
        title: 'Thùng rác nhân viên',
        users: [],
        error: 'Đã xảy ra lỗi khi tải danh sách nhân viên đã xóa. Vui lòng thử lại.',
        
      });
    }
  },

  // Xóa vĩnh viễn người dùng
  forceDeleteEmployee: async (req, res) => {
    try {
      const user = await User.deleteOne({ _id: req.params.id });
      if (!user.deletedCount) {
        return res.status(404).render('admins/trash', {
          title: 'Thùng rác nhân viên',
          users: await User.findWithDeleted({ deleted: true }),
          error: 'Nhân viên không tồn tại hoặc đã bị xóa.',
          
        });
      }
      res.redirect('/admin/trash?message=Xóa vĩnh viễn nhân viên thành công');
    } catch (error) {
      console.error('Lỗi khi xóa vĩnh viễn nhân viên:', error);
      res.status(500).render('admins/trash', {
        title: 'Thùng rác nhân viên',
        users: await User.findWithDeleted({ deleted: true }),
        error: 'Đã xảy ra lỗi khi xóa vĩnh viễn nhân viên. Vui lòng thử lại.',
        
      });
    }
  },

  // Khôi phục người dùng
  restoreEmployee: async (req, res) => {
    try {
      const user = await User.restore({ _id: req.params.id });
      if (!user) {
        return res.status(404).render('admins/trash', {
          title: 'Thùng rác nhân viên',
          users: await User.findWithDeleted({ deleted: true }),
          error: 'Nhân viên không tồn tại hoặc chưa bị xóa.',
          
        });
      }
      res.redirect('/admin/trash?message=Khôi phục nhân viên thành công');
    } catch (error) {
      console.error('Lỗi khi khôi phục nhân viên:', error);
      res.status(500).render('admins/trash', {
        title: 'Thùng rác nhân viên',
        users: await User.findWithDeleted({ deleted: true }),
        error: 'Đã xảy ra lỗi khi khôi phục nhân viên. Vui lòng thử lại.',
        
      });
    }
  },
  getRevenueReport: async (req, res) => {
    const period = req.query.period || 'week'; // Đặt mặc định ngay khi lấy query
    const date = req.query.date || '';
    console.log('Tham số báo cáo:', { period, date });

    try {
      // Xác định khoảng thời gian
      let startDate, endDate;
      if (period === 'week' && date) {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'month' && date) {
        startDate = new Date(date);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        return res.render('admins/revenue-report', {
          title: 'Báo cáo doanh thu',
          data: null,
          period,
          date,
          error: 'Vui lòng chọn khoảng thời gian hợp lệ.',
          
        });
      }

      // Aggregation pipeline
      const report = await Booking.aggregate([
        {
          $match: {
            checkin: { $gte: startDate, $lte: endDate },
            status: { $in: ['pending', 'confirmed'] },
          },
        },
        {
          $lookup: {
            from: 'rooms',
            localField: 'roomId',
            foreignField: '_id',
            as: 'room',
          },
        },
        { $unwind: '$room' },
        {
          $lookup: {
            from: 'roomtypes',
            localField: 'room.typeId',
            foreignField: '_id',
            as: 'roomType',
          },
        },
        { $unwind: '$roomType' },
        {
          $group: {
            _id: '$roomType._id',
            roomTypeName: { $first: '$roomType.name' },
            totalRevenue: { $sum: '$totalPrice' },
            roomCount: { $sum: '$roomCount' },
          },
        },
        { $sort: { roomTypeName: 1 } },
      ]);
   
      const chartData = {
        labels: report.map((item) => item.roomTypeName),
        revenue: report.map((item) => Number(item.totalRevenue)),
        roomCount: report.map((item) => Number(item.roomCount)),
      };
      console.log('Dữ liệu báo cáo:', chartData.revenue, chartData.roomCount);
      res.render('admins/revenue-report', {
        title: 'Báo cáo doanh thu',
        data: chartData,
        period,
        date,
        error: null,
        
      });
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo doanh thu:', error);
      res.status(500).render('admins/revenue-report', {
        title: 'Báo cáo doanh thu',
        data: null,
        period,
        date,
        error: 'Đã xảy ra lỗi khi tạo báo cáo. Vui lòng thử lại.',
        
      });
    }
  },
};

module.exports = AdminController;