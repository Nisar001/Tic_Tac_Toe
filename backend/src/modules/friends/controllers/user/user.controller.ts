import { Request, Response } from 'express';
import UserModel, { IUser } from '../../../../models/user.model';
import { logInfo, logError } from '../../../../utils/logger';

// Search users
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const userId = (req.user as IUser)._id;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    const searchQuery = q.trim();
    if (searchQuery.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters long' });
    }
    const users = await UserModel.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ],
      isVerified: true
    })
    .select('username email avatar level energySystem')
    .limit(20)
    .sort({ username: 1 });
    logInfo(`User search for "${searchQuery}" returned ${users.length} results`);
    res.json({ success: true, message: 'Users found successfully', data: users });
  } catch (error) {
    logError(`Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to search users', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
