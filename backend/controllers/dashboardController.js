const Analytics = require('../services/analyticsService');

const getDashboard = async (req, res, next) => {
  try {
    const stats = await Analytics.getDashboardStats(req.user.id);
    return res.json({ stats });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboard
};
