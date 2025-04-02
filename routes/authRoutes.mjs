import express from 'express';
import auth from '../models/auth.mjs';

const router = express.Router();

router.post('/register', async (req, res) => {
  const result = await auth.register(req.body);
  if (result.errors) {
    return res.status(result.errors.status).json(result);
  }
  res.status(201).json(result);
});

router.post('/login', async (req, res) => {
  const result = await auth.login(req.body);
  if (result.errors) {
    return res.status(result.errors.status).json(result);
  }
  res.status(200).json(result);
});

export default router;
