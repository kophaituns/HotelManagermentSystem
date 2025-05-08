const User = require('../model/User');
const jwt = require('jsonwebtoken');
const {mongooseToObject} = require('../../util/mongoose');
module.exports = async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'MY_SECRET_KEY');
    const user = await User.findById(decoded.id).select('-passwordHash');
    res.locals.currentUser =   mongooseToObject(user);
  } catch (error) {
    res.locals.currentUser = null;
  }

  next();
};
