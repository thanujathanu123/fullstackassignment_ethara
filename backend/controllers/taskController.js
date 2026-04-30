const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const ActivityLog = require('../models/activityLogModel');
const {
  emitProjectEvent,
  emitUserEvent
} = require('../services/realtimeService');

const sanitizeTaskUpdates = (body) => {
  const allowed = ['title', 'description', 'assignedTo', 'status', 'deadline'];

  return allowed.reduce((updates, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = body[key] === '' ? null : body[key];
    }

    return updates;
  }, {});
};

const createTask = async (req, res, next) => {
  try {
    const assignedMembership = await Project.findMembership(req.body.projectId, req.body.assignedTo);

    if (!assignedMembership) {
      return res.status(400).json({ message: 'Assigned user must belong to the project' });
    }

    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      assignedTo: req.body.assignedTo,
      projectId: req.body.projectId,
      status: req.body.status,
      deadline: req.body.deadline
    });
    const activity = await ActivityLog.create({
      projectId: req.body.projectId,
      taskId: task.id,
      actorId: req.user.id,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      metadata: {
        title: task.title,
        assigned_to: task.assigned_to,
        status: task.status,
        deadline: task.deadline
      }
    });

    emitProjectEvent(req.body.projectId, 'task.created', { activity, task });
    emitUserEvent(task.assigned_to, 'task.assigned', { projectId: req.body.projectId, taskId: task.id });

    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
};

const getTasksByProject = async (req, res, next) => {
  try {
    const isAdmin = req.projectMember.role === 'admin';
    const tasks = await Task.findByProject({
      projectId: req.params.projectId,
      assignedTo: isAdmin ? null : req.user.id
    });

    return res.json({ tasks });
  } catch (error) {
    return next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const membership = await Project.findMembership(task.project_id, req.user.id);

    if (!membership) {
      return res.status(403).json({ message: 'You do not belong to this project' });
    }

    const updates = sanitizeTaskUpdates(req.body);
    const updateKeys = Object.keys(updates);

    if (updateKeys.length === 0) {
      return res.status(400).json({ message: 'At least one task field is required' });
    }

    if (membership.role !== 'admin') {
      const isAssignedUser = task.assigned_to === req.user.id;
      const onlyStatusChanged = updateKeys.length === 1 && updateKeys[0] === 'status';

      if (!isAssignedUser || !onlyStatusChanged) {
        return res.status(403).json({ message: 'Members can only update status on assigned tasks' });
      }
    }

    if (updates.assignedTo) {
      const assignedMembership = await Project.findMembership(task.project_id, updates.assignedTo);

      if (!assignedMembership) {
        return res.status(400).json({ message: 'Assigned user must belong to the project' });
      }
    }

    const updatedTask = await Task.update(req.params.taskId, updates);
    const activity = await ActivityLog.create({
      projectId: task.project_id,
      taskId: task.id,
      actorId: req.user.id,
      action: 'task.updated',
      entityType: 'task',
      entityId: task.id,
      metadata: {
        title: updatedTask.title,
        previous: {
          title: task.title,
          assigned_to: task.assigned_to,
          status: task.status,
          deadline: task.deadline
        },
        current: {
          title: updatedTask.title,
          assigned_to: updatedTask.assigned_to,
          status: updatedTask.status,
          deadline: updatedTask.deadline
        },
        changed_fields: updateKeys
      }
    });

    emitProjectEvent(task.project_id, 'task.updated', { activity, task: updatedTask });
    emitUserEvent(updatedTask.assigned_to, 'task.updated', { projectId: task.project_id, taskId: task.id });

    if (task.assigned_to && task.assigned_to !== updatedTask.assigned_to) {
      emitUserEvent(task.assigned_to, 'task.unassigned', { projectId: task.project_id, taskId: task.id });
    }

    return res.json({ task: updatedTask });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  updateTask
};
