const User = require('../../model/User')
const { mutipleMongooseToObject , mongooseToObject } = require('../../../util/mongoose');
const AdminController = {
    index: (req, res) => {
        res.render('admins/index', {
            title: 'Admin Dashboard',
            user: req.user,
        });
    },
    getEmployee(req, res, next) {
        Promise.all([User.find({}), User.countDocumentsDeleted()])
            .then(([users, deletedCount]) =>
                res.render('admins/employee', {
                    deletedCount,
                    users: mutipleMongooseToObject(users),
                }),
            )
            .catch(next);
    },
    createEmployee : (req, res) => {
        res.render('admins/create');
    },
    storeEmployee: (req, res) => {
        const { username, password, isAdmin, name, position, dob, email, phone } = req.body;
    
        const avatar = req.file?.path || ''; // Đường dẫn ảnh từ Cloudinary
    
        const user = new User({
          username,
          passwordHash: password,
          isAdmin: isAdmin === 'true',
          name,
          position,
          dob,
          email,
          phone,
          avatar,
        });
    
        user.save()
          .then(() => res.redirect('/admin/employee'))
          .catch(err => {
            console.error('Lỗi khi tạo người dùng:', err);
            res.status(500).send('Lỗi khi tạo người dùng');
          });
      },
}

module.exports = AdminController;