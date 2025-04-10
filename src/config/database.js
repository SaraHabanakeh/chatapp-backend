import 'dotenv/config'; // Load environment variables
import mongoose from 'mongoose';

const password = process.env.DB_PASS; // Database password from environment variables

const database = {
  // Connect to MongoDB using Mongoose
  connectMongoose: async function connectMongoose() {
    try {
      // Build the MongoDB connection string dynamically
      const dsn = `mongodb+srv://sahb23:${password}@cluster0.ebgji.mongodb.net/ChatApp?retryWrites=true&w=majority&appName=Cluster0`;

      // Use Mongoose to connect
      await mongoose.connect(dsn, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log("Mongoose connected successfully!");

    } catch (err) {
      console.error("Error connecting Mongoose:", err.message);
      // Exit process in case of error (except in test environment)
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      throw err; // Rethrow the error after logging it
    }
  },

  getDb: async function getDb(collectionName) {
    try {
      const dsn = `mongodb+srv://sahb23:${password}@cluster0.ebgji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
      const client = new MongoClient(dsn, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      const db = await client.db("ChatApp");
      const collection = await db.collection(collectionName);

      return { collection, client, db };
    } catch (error) {
      console.error("Error in MongoClient getDb:", error.message);
      throw error; // Throw error for further handling
    }
  },
};

export default database;
