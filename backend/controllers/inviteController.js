const ActivityLog = require('../models/activityLogModel');
const Invite = require('../models/inviteModel');
const Project = require('../models/projectModel');
const {
  buildInviteUrl,
  createToken,
  hashToken
} = require('../services/inviteTokenService');
const {
  emitProjectEvent,
  emitUserEvent
} = require('../services/realtimeService');

const createInvite = async (req, res, next) => {
  try {
    const token = createToken();
    const expiresInDays = Number(req.body.expiresInDays || 7);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const invite = await Invite.create({
      projectId: req.params.id,
      email: req.body.email,
      role: req.body.role,
      tokenHash: hashToken(token),
      invitedBy: req.user.id,
      expiresAt
    });

    const activity = await ActivityLog.create({
      projectId: req.params.id,
      actorId: req.user.id,
      action: 'invite.created',
      entityType: 'invite',
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at
      }
    });

    emitProjectEvent(req.params.id, 'invite.created', { activity });

    return res.status(201).json({
      invite: {
        ...invite,
        invite_url: buildInviteUrl(token)
      }
    });
  } catch (error) {
    return next(error);
  }
};

const listProjectInvites = async (req, res, next) => {
  try {
    const invites = await Invite.listByProject(req.params.id);
    return res.json({ invites });
  } catch (error) {
    return next(error);
  }
};

const acceptInvite = async (req, res, next) => {
  try {
    const invite = await Invite.findByTokenHash(hashToken(req.body.token));

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    if (invite.revoked_at) {
      return res.status(400).json({ message: 'Invite has been revoked' });
    }

    if (invite.accepted_at) {
      return res.status(400).json({ message: 'Invite has already been accepted' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Invite has expired' });
    }

    if (invite.email !== req.user.email) {
      return res.status(403).json({ message: 'This invite belongs to a different email address' });
    }

    const member = await Project.addMember({
      projectId: invite.project_id,
      userId: req.user.id,
      role: invite.role
    });
    const acceptedInvite = await Invite.markAccepted({
      inviteId: invite.id,
      acceptedBy: req.user.id
    });
    const activity = await ActivityLog.create({
      projectId: invite.project_id,
      actorId: req.user.id,
      action: 'invite.accepted',
      entityType: 'invite',
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
        project_name: invite.project_name
      }
    });

    emitProjectEvent(invite.project_id, 'invite.accepted', { activity });
    emitUserEvent(req.user.id, 'invite.accepted', { projectId: invite.project_id });

    return res.json({
      invite: acceptedInvite,
      member,
      project: {
        id: invite.project_id,
        name: invite.project_name
      }
    });
  } catch (error) {
    return next(error);
  }
};

const revokeInvite = async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.inviteId);

    if (!invite || invite.project_id !== req.params.id) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const revokedInvite = await Invite.revoke(invite.id);

    if (!revokedInvite) {
      return res.status(400).json({ message: 'Invite cannot be revoked' });
    }

    const activity = await ActivityLog.create({
      projectId: req.params.id,
      actorId: req.user.id,
      action: 'invite.revoked',
      entityType: 'invite',
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role
      }
    });

    emitProjectEvent(req.params.id, 'invite.revoked', { activity });

    return res.json({ invite: revokedInvite });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  acceptInvite,
  createInvite,
  listProjectInvites,
  revokeInvite
};
