const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Get all documents for user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const docs = await Document.find({
      $or: [
        { ownerId: req.params.userId },
        { 'sharedWith.userId': req.params.userId }
      ]
    })
    .populate('ownerId', 'name email')
    .sort({ updatedAt: -1 });
    
    const enhancedDocs = docs.map(doc => ({
      ...doc.toObject(),
      canEdit: doc.hasAccess(req.params.userId, 'edit'),
      access: doc.ownerId._id.toString() === req.params.userId ? 'owner' : 'shared'
    }));
    
    res.json({ documents: enhancedDocs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single document
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('sharedWith.userId', 'name email');
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.hasAccess(req.userId, 'view')) return res.status(403).json({ error: 'Access denied' });
    
    res.json({
      ...doc.toObject(),
      canEdit: doc.hasAccess(req.userId, 'edit')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create document
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    const doc = new Document({
      title: title || 'Untitled Document',
      content: content || '<p>Start writing...</p>',
      ownerId: req.userId
    });
    
    await doc.save();
    
    res.status(201).json({
      ...doc.toObject(),
      canEdit: true,
      access: 'owner'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update document (rename or content)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = await Document.findById(req.params.id);
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.hasAccess(req.userId, 'edit')) return res.status(403).json({ error: 'No edit permission' });
    
    if (title) doc.title = title;
    if (content) {
      doc.content = content;
      doc.version += 1;
    }
    
    await doc.save();
    
    res.json({
      ...doc.toObject(),
      canEdit: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share document
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userEmail, permission = 'view' } = req.body;
    const doc = await Document.findById(req.params.id);
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only owner can share' });
    }
    
    const userToShare = await User.findOne({ email: userEmail });
    if (!userToShare) return res.status(404).json({ error: 'User not found' });
    
    if (doc.sharedWith.some(s => s.userId.toString() === userToShare._id.toString())) {
      return res.status(400).json({ error: 'User already has access' });
    }
    
    doc.sharedWith.push({ userId: userToShare._id, permission });
    await doc.save();
    
    res.json({ message: 'Document shared successfully', sharedWith: doc.sharedWith });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only owner can delete' });
    }
    
    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export document as HTML
router.get('/:id/export/html', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${doc.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
          h1 { color: #333; }
          .content { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${doc.title}</h1>
        <div class="content">${doc.content}</div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.html"`);
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;