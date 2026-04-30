const crypto = require('crypto');

const createToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) => crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

const buildInviteUrl = (token) => {
  const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${clientUrl.replace(/\/$/, '')}/invites/${token}`;
};

module.exports = {
  buildInviteUrl,
  createToken,
  hashToken
};
