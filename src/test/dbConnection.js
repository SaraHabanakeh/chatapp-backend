import database from '../config/database.js';
import mongoose from 'mongoose';

async function testConnections() {
    try {
        console.log('Testing MongoDB connections...');

        // Test Mongoose connection
        console.log('\nTesting Mongoose connection...');
        await database.connectMongoose();
        console.log('Mongoose connection successful!');

        // Test native MongoDB client
        console.log('\nTesting native MongoDB client...');
        const { collection, client, db } = await database.getDb('test');
        console.log('Native MongoDB client connection successful!');

        // Test a simple operation
        console.log('\nTesting database operations...');
        const testDoc = { message: 'Test connection', timestamp: new Date() };
        const result = await collection.insertOne(testDoc);
        console.log('Insert test successful:', result.insertedId);

        // Clean up
        await collection.deleteOne({ _id: result.insertedId });
        console.log('Cleanup successful');

        // Close connections
        await client.close();
        await mongoose.connection.close();
        console.log('\nAll connections closed successfully');

    } catch (error) {
        console.error('Connection test failed:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        process.exit(1);
    }
}

testConnections().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 