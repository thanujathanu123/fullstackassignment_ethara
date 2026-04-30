const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { signupRules, loginRules } = require('../middleware/validators');

const router = express.Router();

router.post('/signup', signupRules, validateRequest, authController.signup);
router.post('/login', loginRules, validateRequest, authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
