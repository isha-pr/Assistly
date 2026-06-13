const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['agent', 'customer'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Participant', ParticipantSchema);
