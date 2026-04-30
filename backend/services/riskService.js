const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const getHoursBetween = (start, end) => (end.getTime() - start.getTime()) / 36e5;

const scoreTaskRisk = (task) => {
  if (task.status === 'Done') {
    return {
      risk_score: 0,
      risk_level: 'none',
      risk_reason: 'Task is complete'
    };
  }

  const now = new Date();
  const createdAt = new Date(task.created_at);
  const deadline = new Date(task.deadline);
  const hoursRemaining = getHoursBetween(now, deadline);
  const totalWindowHours = Math.max(getHoursBetween(createdAt, deadline), 1);
  const elapsedRatio = clamp(getHoursBetween(createdAt, now) / totalWindowHours, 0, 1);
  const openLoad = Number(task.assigned_open_tasks || 0);
  const overdueLoad = Number(task.assigned_overdue_tasks || 0);

  if (hoursRemaining < 0) {
    return {
      risk_score: 100,
      risk_level: 'overdue',
      risk_reason: 'Deadline has passed'
    };
  }

  let score = 0;
  const reasons = [];

  if (task.status === 'To Do') {
    score += 34;
    reasons.push('not started');
  } else if (task.status === 'In Progress') {
    score += 16;
    reasons.push('in progress');
  }

  if (hoursRemaining <= 4) {
    score += 38;
    reasons.push('due within 4 hours');
  } else if (hoursRemaining <= 24) {
    score += 28;
    reasons.push('due within 24 hours');
  } else if (hoursRemaining <= 72) {
    score += 16;
    reasons.push('due within 3 days');
  }

  if (elapsedRatio >= 0.85) {
    score += 18;
    reasons.push('most of the schedule has elapsed');
  } else if (elapsedRatio >= 0.7) {
    score += 10;
    reasons.push('schedule is more than 70% elapsed');
  }

  if (openLoad >= 5) {
    score += 10;
    reasons.push('assignee has a heavy open workload');
  }

  if (overdueLoad > 0) {
    score += Math.min(overdueLoad * 8, 20);
    reasons.push('assignee already has overdue work');
  }

  const riskScore = clamp(Math.round(score));
  let riskLevel = 'low';

  if (riskScore >= 75) {
    riskLevel = 'high';
  } else if (riskScore >= 45) {
    riskLevel = 'medium';
  }

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_reason: reasons.length ? reasons.join(', ') : 'healthy timeline'
  };
};

const attachRisk = (task) => ({
  ...task,
  ...scoreTaskRisk(task)
});

module.exports = {
  attachRisk,
  scoreTaskRisk
};
