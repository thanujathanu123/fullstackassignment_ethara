const Analytics = require('../services/analyticsService');

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics(req.user.id);
    return res.json({ analytics });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAnalytics
};
