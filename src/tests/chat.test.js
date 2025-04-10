import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import database from '../config/database.js';

let user1, user2, user3;
let authToken1, authToken2, authToken3;
let testChatId;

// Increase timeout for all tests
jest.setTimeout(30000);

beforeAll(async () => {
    try {
        console.log('Connecting to database...');
        // Connect to test database
        await database.connectMongoose();
        console.log('Database connected successfully');
        
        // Clear the test database
        console.log('Clearing test database...');
        await User.deleteMany({});
        await Chat.deleteMany({});
        console.log('Test database cleared');

        // Create test users
        console.log('Creating test users...');
        const user1Response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'user1',
                email: 'user1@example.com',
                password: 'password123'
            });

        const user2Response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'user2',
                email: 'user2@example.com',
                password: 'password123'
            });

        user1 = user1Response.body.user;
        user2 = user2Response.body.user;
        authToken1 = user1Response.body.token;
        console.log('authToken1:', authToken1);
        authToken2 = user2Response.body.token;
        console.log('Test users created successfully');

        const userInDb1 = await User.findById(user1.id);
        const userInDb2 = await User.findById(user2.id);
        console.log('User 1 in DB:', userInDb1);
        console.log('User 2 in DB:', userInDb2);

        // Create chat between user1 and user2
        const chatResponse = await request(app)
            .post('/api/chats')
            .set('Authorization', `Bearer ${authToken1}`)
            .send({
                participants: [user2.id],
                isGroup: false
            });

        testChatId = chatResponse.body._id;
        console.log('Test chat created successfully with chat ID:', testChatId);
               // Now, try fetching users after ensuring the chat is created
        const users = await User.find();  // Get all users from the database
        console.log('All users after creating chat:', users);


    } catch (error) {
        console.error('Failed to set up test database:', error);
        throw error;
    }
});

afterAll(async () => {
    try {
        console.log('Cleaning up test database...');
        // Clean up test database
        //await User.deleteMany({});
        await Chat.deleteMany({});
        await mongoose.connection.close();
        console.log('Test database cleaned up successfully');
    } catch (error) {
        console.error('Failed to clean up test database:', error);
    }
});

describe('Chat Management', () => {

    test('should create a new chat between two users', async () => {
        // Ensure the chat ID is defined
        expect(testChatId).toBeDefined();

        const response = await request(app)
            .post('/api/chats')
            .set('Authorization', `Bearer ${authToken1}`)
            .send({
                participants: [user2.id],
                isGroup: false
            });

        console.log('Chat creation response:', JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.participants).toHaveLength(2);
        expect(response.body.participants).toContainEqual(expect.objectContaining({ id: user1.id }));
        expect(response.body.participants).toContainEqual(expect.objectContaining({ id: user2.id }));
    });

    test('should get all chats for a user', async () => {
        const response = await request(app)
            .get('/api/chats')
            .set('Authorization', `Bearer ${authToken1}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0]._id).toBe(testChatId);
    });

    test('should send a message in the chat', async () => {
        // Verify the chat ID is defined and valid
        console.log('Attempting to send message to chat:', testChatId);
        expect(testChatId).toBeDefined();
        const users = await User.find();  // Get all users from the database
        console.log('All users:', users);
        // Send the message
        const response = await request(app)
            .post(`/api/chats/${testChatId}/messages`)
            .set('Authorization', `Bearer ${authToken1}`)
            .send({
                content: 'Hello from user1!'
            });
    
        console.log('Send message response:', response.status, response.body);
    
        // Ensure response status is correct
        expect(response.status).toBe(201);
        expect(response.body.content).toBe('Hello from user1!');
        expect(response.body.sender.id).toBe(user1.id);
    });
    

    test('should get messages for a chat', async () => {
        const response = await request(app)
            .get(`/api/chats/${testChatId}/messages`)
            .set('Authorization', `Bearer ${authToken1}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].content).toBe('Hello from user1!');
    });

    test('should not allow non-participant to send message', async () => {
        // Register user3
        const user3Response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'user3',
                email: 'user3@example.com',
                password: 'password123'
            });

        user3 = user3Response.body.user;
        authToken3 = user3Response.body.token;

        // Verify we have a valid chat ID
        expect(testChatId).toBeDefined();
        console.log('Attempting to send message to chat:', testChatId);

        const response = await request(app)
            .post(`/api/chats/${testChatId}/messages`)
            .set('Authorization', `Bearer ${authToken3}`)
            .send({
                content: 'Hello from user3!'
            });
        console.log('response', response.body)
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Not authorized');
    });

    test('should create a group chat', async () => {
        const response = await request(app)
            .post('/api/chats')
            .set('Authorization', `Bearer ${authToken1}`)
            .send({
                participants: [user2.id],
                isGroup: true,
                groupName: 'Test Group'
            });

        expect(response.status).toBe(201);
        expect(response.body.isGroup).toBe(true);
        expect(response.body.groupName).toBe('Test Group');
        expect(response.body.groupAdmin.id).toBe(user1.id);
    });
});
