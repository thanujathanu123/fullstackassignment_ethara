const { body, param } = require('express-validator');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const statuses = ['To Do', 'In Progress', 'Done'];
const roles = ['admin', 'member'];

const signupRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Name must be between 2 and 120 characters'),
  body('email')
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
];

const loginRules = [
  body('email')
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const projectRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 140 })
    .withMessage('Project name must be between 2 and 140 characters')
];

const addMemberRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID'),
  body('email')
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage('A valid member email is required'),
  body('role')
    .isIn(roles)
    .withMessage('Role must be admin or member')
];

const projectIdParamRules = [
  param('projectId').isUUID().withMessage('Project id must be a valid UUID')
];

const projectMembersParamRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID')
];

const removeMemberRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID'),
  param('userId').isUUID().withMessage('User id must be a valid UUID')
];

const createInviteRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID'),
  body('email')
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage('A valid invite email is required'),
  body('role')
    .isIn(roles)
    .withMessage('Role must be admin or member'),
  body('expiresInDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Invite expiry must be between 1 and 30 days')
];

const projectInviteParamRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID')
];

const revokeInviteRules = [
  param('id').isUUID().withMessage('Project id must be a valid UUID'),
  param('inviteId').isUUID().withMessage('Invite id must be a valid UUID')
];

const acceptInviteRules = [
  body('token')
    .trim()
    .isLength({ min: 32, max: 128 })
    .withMessage('A valid invite token is required')
];

const createTaskRules = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 180 })
    .withMessage('Task title must be between 2 and 180 characters'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Task description cannot exceed 5000 characters'),
  body('assignedTo')
    .isUUID()
    .withMessage('Assigned user must be a valid UUID'),
  body('projectId')
    .isUUID()
    .withMessage('Project id must be a valid UUID'),
  body('status')
    .optional()
    .isIn(statuses)
    .withMessage('Status must be To Do, In Progress, or Done'),
  body('deadline')
    .isISO8601()
    .withMessage('Deadline must be a valid ISO-8601 date')
];

const updateTaskRules = [
  param('taskId').isUUID().withMessage('Task id must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 180 })
    .withMessage('Task title must be between 2 and 180 characters'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Task description cannot exceed 5000 characters'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned user must be a valid UUID'),
  body('status')
    .optional()
    .isIn(statuses)
    .withMessage('Status must be To Do, In Progress, or Done'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO-8601 date')
];

module.exports = {
  signupRules,
  loginRules,
  projectRules,
  addMemberRules,
  projectIdParamRules,
  projectMembersParamRules,
  removeMemberRules,
  createInviteRules,
  projectInviteParamRules,
  revokeInviteRules,
  acceptInviteRules,
  createTaskRules,
  updateTaskRules
};
