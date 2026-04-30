const express = require('express');
const activityController = require('../controllers/activityController');
const inviteController = require('../controllers/inviteController');
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/authMiddleware');
const { authorizeProjectRoles } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  addMemberRules,
  createInviteRules,
  projectInviteParamRules,
  projectMembersParamRules,
  projectRules,
  revokeInviteRules,
  removeMemberRules
} = require('../middleware/validators');

const router = express.Router();

router.use(authenticate);

router.get('/', projectController.getProjects);
router.post('/', projectRules, validateRequest, projectController.createProject);
router.get(
  '/:id/members',
  projectMembersParamRules,
  validateRequest,
  authorizeProjectRoles('admin', 'member'),
  projectController.getProjectMembers
);
router.post(
  '/:id/add-member',
  addMemberRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  projectController.addMember
);
router.get(
  '/:id/activity',
  projectMembersParamRules,
  validateRequest,
  authorizeProjectRoles('admin', 'member'),
  activityController.getProjectActivity
);
router.get(
  '/:id/invites',
  projectInviteParamRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  inviteController.listProjectInvites
);
router.post(
  '/:id/invites',
  createInviteRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  inviteController.createInvite
);
router.delete(
  '/:id/invites/:inviteId',
  revokeInviteRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  inviteController.revokeInvite
);
router.delete(
  '/:id/members/:userId',
  removeMemberRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  projectController.removeMember
);

module.exports = router;
