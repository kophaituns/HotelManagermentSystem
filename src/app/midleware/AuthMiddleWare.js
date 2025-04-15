const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');


const middlewareController = {
    verifyToken: (req, res, next) => {
        const token = req.headers.token;
        if (!token) {
            return res
                .status(401)
                .json({ message: 'You are not authenticated' });
        }
        if (!token) {
            return res.status(403).json({ message: 'Invalid token format' });
        }
     
        jwt.verify(token, process.env.JWT_SECRET || 'MY_SECRET_KEY', (err, user) => {
                if (err) {
                 return res.status(403).json({ message: 'Token is not valid' });
                }
                req.user = user;
                next();
          });


    }
}

module.exports = middlewareController;  
