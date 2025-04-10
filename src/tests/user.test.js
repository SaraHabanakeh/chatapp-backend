import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import User from '../models/User.js';
import database from '../config/database.js';

let testUser;
let authToken;

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
        //await User.deleteMany({});
        console.log('Test database cleared');
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
        await mongoose.connection.close();
        console.log('Test database cleaned up successfully');
    } catch (error) {
        console.error('Failed to clean up test database:', error);
    }
});

describe('User Authentication', () => {
    test('should register a new user', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(201);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.username).toBe('testuser');
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.body).toHaveProperty('token');

        testUser = response.body.user;
        authToken = response.body.token;
    });

    test('should not register with existing email', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'testuser2',
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('User already exists');
    });

    test('should login with correct credentials', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.body).toHaveProperty('token');
    });

    test('should not login with incorrect password', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid credentials');
    });

    test('should get user profile with valid token', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testUser.id);
        expect(response.body.email).toBe('test@example.com');
    });

    test('should not get profile without token', async () => {
        const response = await request(app)
            .get('/api/users/profile');
  
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('No token provided');
    });

    test('should not get profile with invalid token', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', 'Bearer invalidtoken');
        
        console.log('response here', response.body,response.status);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('jwt malformed');
    });
}); 