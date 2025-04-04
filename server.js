import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';


import database from './db/database.mjs';
import { loggingMiddleware, authMiddleware, attachUserMiddleware } from './middlewares/authMiddleware.mjs';

import authRoutes from './routes/authRoutes.mjs';
import contactsRoute from './routes/contactsRoute.mjs';
import userInfoRoute from './routes/userInfoRoute.mjs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);


await database.connectMongoose();


app.use(express.static(path.join(process.cwd(), 'public')));
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(loggingMiddleware);
app.use(authMiddleware);
app.use(attachUserMiddleware);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');


app.use('/auth', authRoutes);
app.use('/', contactsRoute);
app.use('/', userInfoRoute);


app.get('/', async (req, res) => {
  res.render('index', {
    title: 'API Documentation',
    routes: [
      { method: 'GET', path: '/', description: 'API Documentation' },
      { method: 'POST', path: '/auth/register', description: 'Register a new user' },
      { method: 'POST', path: '/auth/login', description: 'Login user and receive JWT' },
      { method: 'GET', path: '/contacts', description: 'contacts List' },
      { method: 'GET', path: '/user', description: 'Logged in user info' },
    ]
  });
});

const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  console.log(` App listening on http://localhost:${port}`);
});
