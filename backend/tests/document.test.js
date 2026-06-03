const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Document = require('../models/Document');
const User = require('../models/User');

describe('Document API Tests', () => {
  let testUser;
  let testDoc;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test_docs');
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User'
    });
  });
  
  afterAll(async () => {
    await Document.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });
  
  test('Should create a new document', async () => {
    const res = await request(app)
      .post('/api/docs')
      .send({
        title: 'Test Document',
        content: '<p>Test content</p>',
        ownerId: testUser._id
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Test Document');
    testDoc = res.body;
  });
  
  test('Should retrieve user documents', async () => {
    const res = await request(app)
      .get(`/api/docs/user/${testUser._id}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
    expect(res.body.documents.length).toBeGreaterThan(0);
  });
  
  test('Should update document', async () => {
    const res = await request(app)
      .put(`/api/docs/${testDoc._id}`)
      .send({
        userId: testUser._id,
        title: 'Updated Title'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });
  
  test('Should share document with another user', async () => {
    const anotherUser = await User.create({
      email: 'another@example.com',
      name: 'Another User'
    });
    
    const res = await request(app)
      .post(`/api/docs/${testDoc._id}/share`)
      .send({
        ownerId: testUser._id,
        userEmail: 'another@example.com',
        permission: 'edit'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Document shared successfully');
  });
  
  test('Should delete document', async () => {
    const res = await request(app)
      .delete(`/api/docs/${testDoc._id}`)
      .send({ userId: testUser._id });
    
    expect(res.statusCode).toBe(200);
  });
});