import jwt from 'jsonwebtoken';
import pkg from 'express-jwt';
import 'dotenv/config';

const { expressjwt } = pkg;
const JWT_SECRET = process.env.JWTSECRET;


const authMiddleware = expressjwt({
  secret: JWT_SECRET,
  algorithms: ['HS256'],
  credentialsRequired: true,
  getToken: (req) => req.headers.authorization?.split(' ')[1],
}).unless({
  path: [
    { url: '/', methods: ['GET'] },
    { url: '/auth/register', methods: ['POST'] },
    { url: '/auth/login', methods: ['POST'] },
  ],
});


const attachUserMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) req.user = decoded;
    });
  }
  next();
};

const loggingMiddleware = (req, res, next) => {
  console.log("Client IP:", req.ip);
  next();
};

export { loggingMiddleware, authMiddleware, attachUserMiddleware };
