const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const buildAuthResponse = (user) => ({
  token: jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  ),
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at
  }
});

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => res.json({ user: req.user });

module.exports = {
  signup,
  login,
  me
};
