const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const AuthController = {
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            console.log('Dữ liệu đăng nhập:', { username });

            // Validation
            if (!username || !password) {
                return res.render('login', {
                    error: 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.',
                    formData: { username },
                });
            }

            if (password.length < 6) {
                return res.render('login', {
                    error: 'Mật khẩu phải ít nhất 6 ký tự.',
                    formData: { username },
                });
            }

            // Kiểm tra user
            const user = await User.findOne({ username });
            if (!user) {
                return res.render('login', {
                    error: 'Tên tài khoản hoặc mật khẩu không đúng.',
                    formData: { username },
                });
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.render('login', {
                    error: 'Tên tài khoản hoặc mật khẩu không đúng.',
                    formData: { username },
                });
            }

            // Tạo JWT
            const accessToken = jwt.sign(
                { id: user._id, isAdmin: user.isAdmin, role: user.role },
                process.env.JWT_SECRET || 'MY_SECRET_KEY',
                { expiresIn: '1h' }
            );

            // Lưu token vào cookie
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
            });

            // Redirect theo vai trò
            if (user.isAdmin ) {
                return res.redirect('/admin');
            } else {
                return res.redirect('/staff');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            res.render('login', {
                error: 'Lỗi server. Vui lòng thử lại.',
                formData: { username: req.body.username },
            });
        }
    },

    logout: (req, res) => {
        res.clearCookie('accessToken');
        res.redirect('/login');
    },
};

module.exports = AuthController;