import express from 'express';

const router = express.Router();

// Root health check
router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Detailed health check
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default router; 