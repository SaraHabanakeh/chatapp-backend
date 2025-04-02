import 'dotenv/config';
import { MongoClient, ServerApiVersion } from 'mongodb';
import mongoose from 'mongoose';

const password = process.env.DB_PASS;

const database = {
  getDb: async function getDb (collectionName) {
      let dsn = `mongodb+srv://sahb23:${password}@cluster0.ebgji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

      if (process.env.NODE_ENV === 'test') {
          dsn = "mongodb://localhost:27017/test";
      }

      const client = new MongoClient(dsn, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
      const db = await client.db("ChatApp");
      const collection = await db.collection(collectionName);

      return {
          collection: collection,
          client: client,
          db:db
      };
  },
  
  connectMongoose: async function connectMongoose() {
    try {
      let dsn = `mongodb+srv://sahb23:${password}@cluster0.ebgji.mongodb.net/ChatApp?retryWrites=true&w=majority&appName=Cluster0`;

      if (process.env.NODE_ENV === 'test') {
        dsn = "mongodb://localhost:27017/ChatApp";
      }

      await mongoose.connect(dsn);

      console.log("Mongoose connected successfully!");

    } catch (err) {
      console.error("Error connecting Mongoose:", err.message);
      process.exit(1);
    }

  },
};

export default database;
