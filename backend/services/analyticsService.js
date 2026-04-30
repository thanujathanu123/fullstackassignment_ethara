const ActivityLog = require('../models/activityLogModel');
const Task = require('../models/taskModel');

const percentage = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const buildDashboardStats = (tasks) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'Done').length;
  const pendingTasks = tasks.filter((task) => task.status !== 'Done').length;
  const overdueTasks = tasks.filter((task) => task.status !== 'Done' && new Date(task.deadline) < new Date()).length;
  const predictedOverdueTasks = tasks.filter((task) => (
    task.status !== 'Done' &&
    task.risk_level === 'high' &&
    new Date(task.deadline) >= new Date()
  )).length;
  const completedOnTime = tasks.filter((task) => (
    task.status === 'Done' &&
    task.completed_at &&
    new Date(task.completed_at) <= new Date(task.deadline)
  )).length;

  const completionRate = percentage(completedTasks, totalTasks);
  const onTimeRate = percentage(completedOnTime, completedTasks);
  const overdueHealth = totalTasks > 0 ? Math.max(0, 100 - percentage(overdueTasks, totalTasks)) : 100;
  const riskHealth = totalTasks > 0 ? Math.max(0, 100 - percentage(predictedOverdueTasks, totalTasks)) : 100;
  const productivityScore = Math.round(
    completionRate * 0.45 +
    onTimeRate * 0.25 +
    overdueHealth * 0.2 +
    riskHealth * 0.1
  );

  return {
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    pending_tasks: pendingTasks,
    overdue_tasks: overdueTasks,
    predicted_overdue_tasks: predictedOverdueTasks,
    completion_rate: completionRate,
    on_time_completion_rate: onTimeRate,
    productivity_score: productivityScore
  };
};

const groupByProject = (tasks) => {
  const projects = new Map();

  tasks.forEach((task) => {
    const current = projects.get(task.project_id) || {
      project_id: task.project_id,
      project_name: task.project_name,
      tasks: []
    };

    current.tasks.push(task);
    projects.set(task.project_id, current);
  });

  return Array.from(projects.values()).map((project) => ({
    project_id: project.project_id,
    project_name: project.project_name,
    ...buildDashboardStats(project.tasks)
  })).sort((a, b) => b.productivity_score - a.productivity_score);
};

const getDashboardStats = async (userId) => {
  const tasks = await Task.findVisibleForUser(userId);
  return buildDashboardStats(tasks);
};

const getAnalytics = async (userId) => {
  const [tasks, recentActivity] = await Promise.all([
    Task.findVisibleForUser(userId),
    ActivityLog.listForUserProjects(userId, 12)
  ]);

  const status_breakdown = ['To Do', 'In Progress', 'Done'].map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length
  }));

  return {
    summary: buildDashboardStats(tasks),
    by_project: groupByProject(tasks),
    status_breakdown,
    high_risk_tasks: tasks
      .filter((task) => task.risk_level === 'high' || task.risk_level === 'overdue')
      .slice(0, 8),
    recent_activity: recentActivity
  };
};

module.exports = {
  buildDashboardStats,
  getAnalytics,
  getDashboardStats
};
