const User = require('../../model/User')
const { mutipleMongooseToObject , mongooseToObject } = require('../../../util/mongoose');
const AdminController = {
    // Hiển thị trang chính của admin
    index: (req, res) => {
        res.render('admins/index', {
            title: 'Admin Dashboard',
            user: req.user,
        });
    },
    // Lấy danh sách người dùng
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
    // Tạo người dùng mới
    createEmployee : (req, res) => {
        res.render('admins/create');
    },
    // Lưu thông tin người dùng mới
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
    //   Hiển thị thông tin người dùng
    showEmployee: (req, res) => {
        User.findById(req.params.id)
            .then(user => {
                if (!user) {
                    return res.status(404).send('Người dùng không tồn tại');
                }
                res.render('admins/show', {
                    user: mongooseToObject(user),
                });
            })
            .catch(err => {
                console.error('Lỗi khi tìm người dùng:', err);
                res.status(500).send('Lỗi khi tìm người dùng');
            });
        },

        // Chỉnh sửa thông tin người dùng
        editEmployee: (req, res) => {
            User.findById(req.params.id)
                .then(user => {
                    if (!user) {
                        return res.status(404).send('Người dùng không tồn tại');
                    }
                    res.render('admins/edit', {
                        user: mongooseToObject(user),
                    });
                })
                .catch(err => {
                    console.error('Lỗi khi tìm người dùng:', err);
                    res.status(500).send('Lỗi khi tìm người dùng');
                });
        },
        updateEmployee : (req, res) => {
            console.log('Cập nhật thông tin người dùng:', req.body);
            const { username, isAdmin, name, position, dob, email, phone } = req.body;
        
            const avatar = req.file?.path || ''; // Đường dẫn ảnh từ Cloudinary
        
            User.findByIdAndUpdate(req.params.id, {
                username,
                isAdmin: isAdmin === 'true',
                name,
                position,
                dob,
                email,
                phone,
                avatar,
            })
                .then(() => res.redirect('/admin/employee'))
                .catch(err => {
                    console.error('Lỗi khi cập nhật người dùng:', err);
                    res.status(500).send('Lỗi khi cập nhật người dùng');
                });
        },



        // Xóa người dùng
        deleteEmployee : (req, res,next) => {
            User.delete({ _id: req.params.id })
            .then(() => res.redirect('/admin/employee'))
            .catch(next);
        },
        // Hiển thị danh sách người dùng đã xóa
        trashEmployee: (req, res, next) => {
            User.findWithDeleted({deleted: true})
                .then(users => {
                    res.render('admins/trash', {
                        users: mutipleMongooseToObject(users),
                    });
                })
                .catch(next);
        },

        forceDeleteEmployee: (req, res, next) => {
            User.deleteOne({ _id: req.params.id })
                .then(() => res.redirect('/admin/trash'))
                .catch(next);
        },
        restoreEmployee: (req, res, next) => {
            User.restore({ _id: req.params.id })
                .then(() => res.redirect('/admin/trash'))
                .catch(next);
        },
    
}

module.exports = AdminController;