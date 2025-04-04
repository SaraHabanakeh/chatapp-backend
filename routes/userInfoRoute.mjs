import express from 'express';
import users from '../models/users.mjs'

const router = express.Router();

router.get('/user', async (req, res) => {
    const email = req.user?.email;

    if ( !email) {
        return res.status(401).json({ error: "Unauthorized: No user email found" });
    }

    const result = await users.getdataByEmail(email);
    if (result.errors) {
        return res.status(result.errors.status).json(result);
    }

    res.status(200).json(result)
});

export default router;
