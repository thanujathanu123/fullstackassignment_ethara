const ActivityLog = require('../models/activityLogModel');

const getProjectActivity = async (req, res, next) => {
  try {
    const activity = await ActivityLog.listByProject(req.params.id);
    return res.json({ activity });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProjectActivity
};
