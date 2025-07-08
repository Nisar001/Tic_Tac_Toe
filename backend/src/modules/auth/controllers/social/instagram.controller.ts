import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../../../../models/user.model';

export const instagramLogin = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('instagram', (err: Error | null, user: any, info: { message?: string }) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication failed', error: err });
    }
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated', info });
    }
    req.logIn(user, (loginErr: Error | null) => {
      if (loginErr) {
        return res.status(500).json({ message: 'Login failed', error: loginErr });
      }
      return res.status(200).json({ message: 'Login successful', user });
    });
  })(req, res, next);
};
