const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  issueCategory: {
    type: String,
    enum: ['Hardware', 'Software', 'Installation', 'Network', 'Other'],
    required: true,
  },
  agentId: {
    type: String,
    required: true,
  },
  agentName: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'active', 'completed'],
    default: 'created',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
  duration: {
    type: String,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
