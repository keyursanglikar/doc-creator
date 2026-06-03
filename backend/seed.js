const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Document = require('./models/Document');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing data
    await User.deleteMany({});
    await Document.deleteMany({});
    
    // Create users
    const alice = await User.create({
      email: 'alice@example.com',
      name: 'Alice Johnson'
    });
    
    const bob = await User.create({
      email: 'bob@example.com',
      name: 'Bob Smith'
    });
    
    const charlie = await User.create({
      email: 'charlie@example.com',
      name: 'Charlie Brown'
    });
    
    // Create documents
    const doc1 = await Document.create({
      title: 'Project Roadmap 2024',
      content: '<h1>Project Roadmap</h1><p>This document outlines our Q1-Q4 goals.</p><ul><li>Launch MVP</li><li>Scale infrastructure</li><li>Expand team</li></ul>',
      ownerId: alice._id
    });
    
    const doc2 = await Document.create({
      title: 'Design System Guidelines',
      content: '<h2>Color Palette</h2><p>Primary: #007bff</p><p>Secondary: #6c757d</p>',
      ownerId: bob._id
    });
    
    const doc3 = await Document.create({
      title: 'Meeting Notes - March 15',
      content: '<p><strong>Decisions made:</strong></p><ol><li>Launch date set to June 1st</li><li>Budget approved</li></ol>',
      ownerId: alice._id
    });
    
    // Share documents
    doc1.sharedWith.push({ userId: bob._id, permission: 'edit' });
    doc2.sharedWith.push({ userId: alice._id, permission: 'view' });
    await doc1.save();
    await doc2.save();
    
    console.log('✅ Database seeded successfully!');
    console.log(`Users created: ${await User.countDocuments()}`);
    console.log(`Documents created: ${await Document.countDocuments()}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDatabase();