const express = require('express');
const inviteController = require('../controllers/inviteController');
const authenticate = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { acceptInviteRules } = require('../middleware/validators');

const router = express.Router();

router.post(
  '/accept',
  authenticate,
  acceptInviteRules,
  validateRequest,
  inviteController.acceptInvite
);

module.exports = router;
