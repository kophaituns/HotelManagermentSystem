const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const AuthController = {
  register: async (req, res) => {  
    try {
      const { username, password, email } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username,
        password: hashedPassword,
        email,
      });
      await newUser.save();
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.log('Register Error:', error);
      res.status(500).json({ message: 'Error registering user', error });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username :  req.body.username });
      if (!user) 
        return res.status(404).json({ message: 'User not found' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "MY_SECRET_KEY", { expiresIn: '1h' });
      res.status(200).json({ user: user, accessToken });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error });
    }
  },
}

module.exports = AuthController;