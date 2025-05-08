const jwt = require('jsonwebtoken');

const middlewareController = {
    verifyTokenAndAdminAuth: (req, res, next) => {
        const token = req.cookies.accessToken; // Lấy token từ cookies
        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, process.env.JWT_SECRET || 'MY_SECRET_KEY', (err, user) => {
            if (err) {
                res.clearCookie('accessToken');
                return res.redirect('/login');
            }

            // Kiểm tra xem user có phải admin không
            if (!user.isAdmin) {
                return res.render('error', {
                    message: 'Bạn không có quyền truy cập (yêu cầu quyền admin).',
                });
            }

            req.user = user;
             // Gán thông tin user từ token vào req
            next(); // Tiếp tục nếu là admin
        });
    },

    // Middleware kiểm tra token cho staff
    verifyToken: (req, res, next) => {
        const token = req.cookies.accessToken; // Lấy token từ cookies
        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, process.env.JWT_SECRET || 'MY_SECRET_KEY', (err, user) => {
            if (err) {
                res.clearCookie('accessToken');
                return res.redirect('/login');
            }

            req.user = user;
            next();
        });
    },
};

module.exports = middlewareController;