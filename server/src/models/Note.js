const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  issueDescription: {
    type: String,
    default: '',
  },
  rootCause: {
    type: String,
    default: '',
  },
  resolution: {
    type: String,
    default: '',
  },
  followUp: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('Note', NoteSchema);
