const Project = require('../models/projectModel');

const readProjectId = (req) => (
  req.params.projectId ||
  req.params.id ||
  req.body.projectId ||
  req.body.project_id
);

const authorizeProjectRoles = (...roles) => async (req, res, next) => {
  try {
    const projectId = readProjectId(req);

    if (!projectId) {
      return res.status(400).json({ message: 'Project id is required' });
    }

    const membership = await Project.findMembership(projectId, req.user.id);

    if (!membership) {
      return res.status(403).json({ message: 'You do not belong to this project' });
    }

    if (!roles.includes(membership.role)) {
      return res.status(403).json({ message: 'You do not have permission for this project' });
    }

    req.projectMember = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authorizeProjectRoles
};
