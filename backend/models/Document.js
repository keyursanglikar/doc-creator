const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Document'
  },
  content: {
    type: String,
    default: '<p>Start writing your document here...</p>'
  },
  rawContent: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  wordCount: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isUploaded: {
    type: Boolean,
    default: false
  },
  originalFilename: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: ''
  },
  metadata: {
    type: Object,
    default: {
      pages: 1,
      words: 0,
      characters: 0,
      images: [],
      shapes: [],
      charts: [],
      equations: [],
      tables: [],
      textBoxes: 0
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware
DocumentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const text = this.content.replace(/<[^>]*>/g, '');
    this.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    this.rawContent = text;
  }
  next();
});

// Method to check user access
DocumentSchema.methods.hasAccess = function(userId, permission = 'view') {
  if (this.ownerId.toString() === userId.toString()) return true;
  
  const share = this.sharedWith.find(s => s.userId.toString() === userId.toString());
  if (!share) return false;
  
  if (permission === 'view') return true;
  if (permission === 'edit') return share.permission === 'edit';
  
  return false;
};

module.exports = mongoose.model('Document', DocumentSchema);