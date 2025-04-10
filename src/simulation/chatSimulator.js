import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

dotenv.config();

class ChatSimulator {
    constructor() {
        this.baseUrl = 'http://localhost:8585/api';
        this.users = [];
        this.sockets = new Map();
        this.messages = [
            "Hello!",
            "How are you?",
            "What's up?",
            "Nice to meet you!",
            "How's your day going?",
            "Any plans for the weekend?",
            "Did you see that new movie?",
            "What do you think about this weather?",
            "Have you tried that new restaurant?",
            "How's work going?"
        ];
    }

    async checkServerAvailability() {
        try {
  
            const response = await axios.get(`${this.baseUrl}/health`);
            console.log('Server is available and responding');
            return true;
        } catch (error) {
            console.error('Server connection error:', error.message);
            console.log('Please make sure:');
            console.log('1. The backend server is running (npm run dev)');
            console.log('2. The server is running on port 8585');
            console.log('3. The server is accessible at http://localhost:8585');
            throw new Error('Server is not available. Please start the backend server first.');
        }
    }

    async initialize() {
        try {
            const password = process.env.DB_PASS;
            const dsn = `mongodb+srv://sahb23:${password}@cluster0.ebgji.mongodb.net/ChatApp?retryWrites=true&w=majority&appName=Cluster0`;
            
            console.log('Attempting to connect to MongoDB...');
            await mongoose.connect(dsn, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            
            console.log('Connected to MongoDB');
            
            // Check if server is available
            console.log('Checking server availability...');
            await this.checkServerAvailability();
        } catch (error) {
            console.error('Failed to initialize:', error.message);
            process.exit(1);
        }
    }

    async createTestUsers(count) {
        console.log(`Creating ${count} test users...`);
        const users = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const response = await axios.post(`${this.baseUrl}/users/register`, {
                    username: `testuser${i}`,
                    email: `testuser${i}@example.com`,
                    password: 'password123'
                });

                users.push({
                    id: response.data.user.id,
                    token: response.data.token,
                    username: response.data.user.username
                });

                if (i % 100 === 0) {
                    console.log(`Created ${i} users...`);
                }
            } catch (error) {
                console.error(`Error creating user ${i}:`, error.message);
            }
        }

        this.users = users;
        console.log(`Successfully created ${users.length} test users`);
    }

    async createChatConnections() {
        console.log('Creating chat connections...');
        const connections = [];
        
        // Create connections between users (each user connects to 5 others)
        for (let i = 0; i < this.users.length; i++) {
            const user = this.users[i];
            const connectionsCount = Math.min(5, this.users.length - 1);
            
            // Get random users to connect with
            const potentialConnections = this.users
                .filter(u => u.id !== user.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, connectionsCount);

            for (const connection of potentialConnections) {
                try {
                    const response = await axios.post(
                        `${this.baseUrl}/chats`,
                        {
                            participants: [connection.id],
                            isGroup: false
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${user.token}`
                            }
                        }
                    );

                    connections.push({
                        chatId: response.data._id,
                        participants: [user.id, connection.id]
                    });

                } catch (error) {
                    console.error(`Error creating chat between ${user.username} and ${connection.username}:`, error.message);
                }
            }

            if (i % 100 === 0) {
                console.log(`Created connections for ${i} users...`);
            }
        }

        console.log(`Created ${connections.length} chat connections`);
        return connections;
    }

    async initializeSockets() {
        console.log('Initializing socket connections...');
        
        for (const user of this.users) {
            try {
                const socket = io('http://localhost:8585', {
                    auth: {
                        token: user.token
                    }
                });

                socket.on('connect', () => {
                    console.log(`Socket connected for ${user.username}`);
                });

                socket.on('disconnect', () => {
                    console.log(`Socket disconnected for ${user.username}`);
                });

                this.sockets.set(user.id, socket);

                if (this.sockets.size % 100 === 0) {
                    console.log(`Initialized ${this.sockets.size} socket connections...`);
                }
            } catch (error) {
                console.error(`Error initializing socket for ${user.username}:`, error.message);
            }
        }
    }

    async simulateChatActivity(durationMinutes) {
        console.log(`Starting chat simulation for ${durationMinutes} minutes...`);
        const endTime = Date.now() + (durationMinutes * 60 * 1000);
        let messageCount = 0;

        while (Date.now() < endTime) {
            // Randomly select a user
            const user = this.users[Math.floor(Math.random() * this.users.length)];
            const socket = this.sockets.get(user.id);

            if (socket) {
                try {
                    // Get user's chats
                    const response = await axios.get(`${this.baseUrl}/chats`, {
                        headers: {
                            Authorization: `Bearer ${user.token}`
                        }
                    });

                    if (response.data.length > 0) {
                        // Select a random chat
                        const chat = response.data[Math.floor(Math.random() * response.data.length)];
                        const message = this.messages[Math.floor(Math.random() * this.messages.length)];

                        // Send message
                        socket.emit('sendMessage', {
                            chatId: chat._id,
                            content: message
                        });

                        messageCount++;
                        if (messageCount % 100 === 0) {
                            console.log(`Sent ${messageCount} messages...`);
                        }
                    }
                } catch (error) {
                    console.error(`Error sending message for ${user.username}:`, error.message);
                }
            }

            // Random delay between messages (0.5 to 2 seconds)
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
        }

        console.log(`Simulation complete. Sent ${messageCount} messages.`);
    }

    async cleanup() {
        console.log('Cleaning up...');
        
        // Close all socket connections
        for (const socket of this.sockets.values()) {
            socket.disconnect();
        }

        // Close database connection
        await mongoose.connection.close();
        console.log('Cleanup complete');
    }
}

// Run the simulation
async function runSimulation() {
    const simulator = new ChatSimulator();
    
    try {
        await simulator.initialize();
        await simulator.createTestUsers(1000);
        await simulator.createChatConnections();
        await simulator.initializeSockets();
        await simulator.simulateChatActivity(5); // 5 minutes of simulation
    } catch (error) {
        console.error('Simulation error:', error);
    } finally {
        await simulator.cleanup();
    }
}

runSimulation(); 