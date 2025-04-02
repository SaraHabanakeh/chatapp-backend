import express from 'express';
import users from '../models/users.mjs'

const router = express.Router();

router.get('/contacts', async (req, res) => {
    const result = await users.getAllUsers();
    if (result.error) {
        return res.status(result.errors.status).json(result);
    }
    res.status(200).json(result)
});

export default router;
