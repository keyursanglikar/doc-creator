const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const User = require('../models/User');
const path = require('path');

// Simple configuration without complex parser first
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.md', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Simple mammoth conversion without complex parsing
const mammoth = require('mammoth');

// Upload endpoint - simplified working version
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let content = '';
    let title = path.basename(file.originalname, path.extname(file.originalname));
    let rawText = '';
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    try {
      if (ext === '.docx' || ext === '.doc') {
        // Convert DOCX to HTML using mammoth
        const result = await mammoth.convertToHtml({ buffer: file.buffer });
        content = result.value;
        rawText = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = rawText.value;
        
        // Add basic styling
        content = `
          <div style="font-family: 'Calibri', Arial, sans-serif; line-height: 1.6; max-width: 100%;">
            ${content}
          </div>
        `;
      } else if (ext === '.txt' || ext === '.md') {
        const text = file.buffer.toString('utf-8');
        rawText = text;
        content = `<pre style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(text)}</pre>`;
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      content = `<p>File uploaded but content could not be parsed. You can edit this document.</p>`;
      rawText = 'Content extraction failed';
    }
    
    // Create document
    const doc = new Document({
      title: title,
      content: content,
      ownerId: userId,
      isUploaded: true,
      originalFilename: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      version: 1,
      rawContent: rawText
    });
    
    await doc.save();
    
    res.status(201).json({
      _id: doc._id,
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId,
      canEdit: true,
      access: 'owner',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: 'Failed to process file',
      message: err.message
    });
  }
});

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = router;