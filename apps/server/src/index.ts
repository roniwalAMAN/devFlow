import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import express from 'express';
import { checkDatabaseConnection } from './services/db';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint - API only
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'DevFlow API is running',
  });
});

// Database health check endpoint
app.get('/api/health/db', async (_req, res) => {
  try {
    const isConnected = await checkDatabaseConnection();

    if (isConnected) {
      res.status(200).json({
        success: true,
        message: 'Database connection is healthy',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database health check error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DevFlow server running on http://localhost:${PORT}`);
});
