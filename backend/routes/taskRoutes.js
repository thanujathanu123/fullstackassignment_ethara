const express = require('express');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authMiddleware');
const { authorizeProjectRoles } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  createTaskRules,
  projectIdParamRules,
  updateTaskRules
} = require('../middleware/validators');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  createTaskRules,
  validateRequest,
  authorizeProjectRoles('admin'),
  taskController.createTask
);
router.get(
  '/:projectId',
  projectIdParamRules,
  validateRequest,
  authorizeProjectRoles('admin', 'member'),
  taskController.getTasksByProject
);
router.put('/:taskId', updateTaskRules, validateRequest, taskController.updateTask);

module.exports = router;
