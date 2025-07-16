import { Router } from 'express';
import {
  getDashboardStats,
  getUsers,
  getGames,
  updateUser,
  deleteUser,
  getSystemSettings,
  updateSystemSettings
} from '../controllers';

const router = Router();

// Dashboard stats
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Game management  
router.get('/games', getGames);

// System settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

export default router;
