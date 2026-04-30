const Project = require('../models/projectModel');
const User = require('../models/userModel');
const ActivityLog = require('../models/activityLogModel');
const {
  emitProjectEvent,
  emitUserEvent
} = require('../services/realtimeService');

const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.findForUser(req.user.id);
    return res.json({ projects });
  } catch (error) {
    return next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const project = await Project.createWithAdmin({
      name: req.body.name,
      createdBy: req.user.id
    });
    const activity = await ActivityLog.create({
      projectId: project.id,
      actorId: req.user.id,
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      metadata: { name: project.name }
    });

    emitProjectEvent(project.id, 'project.created', { activity });
    emitUserEvent(req.user.id, 'project.created', { projectId: project.id });

    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
};

const getProjectMembers = async (req, res, next) => {
  try {
    const members = await Project.listMembers(req.params.id);
    return res.json({ members });
  } catch (error) {
    return next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const targetUser = await User.findByEmail(req.body.email);

    if (!targetUser) {
      return res.status(404).json({ message: 'No user exists with that email' });
    }

    const membership = await Project.addMember({
      projectId: req.params.id,
      userId: targetUser.id,
      role: req.body.role
    });
    const activity = await ActivityLog.create({
      projectId: req.params.id,
      actorId: req.user.id,
      action: 'member.upserted',
      entityType: 'member',
      entityId: targetUser.id,
      metadata: {
        name: targetUser.name,
        email: targetUser.email,
        role: req.body.role
      }
    });

    emitProjectEvent(req.params.id, 'member.upserted', { activity });
    emitUserEvent(targetUser.id, 'member.upserted', { projectId: req.params.id });

    return res.status(201).json({ member: membership });
  } catch (error) {
    return next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const targetMembership = await Project.findMembership(req.params.id, req.params.userId);

    if (!targetMembership) {
      return res.status(404).json({ message: 'Project member not found' });
    }

    if (targetMembership.role === 'admin') {
      const adminCount = await Project.countAdmins(req.params.id);

      if (adminCount <= 1) {
        return res.status(400).json({ message: 'A project must keep at least one admin' });
      }
    }

    await Project.removeMember({
      projectId: req.params.id,
      userId: req.params.userId
    });
    const activity = await ActivityLog.create({
      projectId: req.params.id,
      actorId: req.user.id,
      action: 'member.removed',
      entityType: 'member',
      entityId: req.params.userId,
      metadata: {
        removed_user_id: req.params.userId,
        previous_role: targetMembership.role
      }
    });

    emitProjectEvent(req.params.id, 'member.removed', { activity });
    emitUserEvent(req.params.userId, 'member.removed', { projectId: req.params.id });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProjects,
  createProject,
  getProjectMembers,
  addMember,
  removeMember
};
