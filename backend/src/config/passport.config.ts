import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import UserModel, { IUser } from '../models/user.model';
import { socialConfig } from './social.config';
import { logError, logInfo, logWarn } from '../utils/logger';

// ✅ Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// ✅ Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id).select('-password -refreshTokens');
    done(null, user);
  } catch (error) {
    logError(`Error deserializing user: ${(error as Error).message}`);
    done(error, null);
  }
});

// ✅ Find or create user from social profile
const findOrCreateUser = async (profile: any, provider: string): Promise<IUser> => {
  try {
    const email = profile.emails?.[0]?.value || null;
    
    // For Facebook, if no email is provided, create a temporary email or handle it differently
    let userEmail = email;
    if (!email && provider === 'facebook') {
      // Create a temporary email using Facebook ID
      userEmail = `facebook_${profile.id}@temp.tictactoe.app`;
      logWarn(`No email provided by Facebook for user ${profile.id}, using temporary email`);
    }

    if (!userEmail) {
      throw new Error(`No email or identifier provided by ${provider}`);
    }

    // First try to find user by email
    let user = await UserModel.findOne({ email: userEmail });
    
    // If not found by email, try to find by provider ID
    if (!user) {
      user = await UserModel.findOne({ 
        providerId: profile.id, 
        provider: provider 
      });
    }

    if (user) {
      // Update provider info if changed
      if (user.provider !== provider || user.providerId !== profile.id) {
        user.provider = provider as IUser['provider'];
        user.providerId = profile.id;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        
        // Update email if we now have a real one
        if (email && user.email !== email) {
          user.email = email;
        }
        
        await user.save();
        logInfo(`Updated existing user provider info for ${provider}`);
      }
    } else {
      const username = profile.displayName || 
                     (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : '') ||
                     userEmail.split('@')[0];
      const avatar = profile.photos?.[0]?.value;

      user = new UserModel({
        email: userEmail,
        username,
        avatar,
        provider: provider as IUser['provider'],
        providerId: profile.id,
        isEmailVerified: email ? true : false, // Only verify if we have a real email
        level: 1,
        xp: 0,
        energy: 5,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        createdAt: new Date(),
        lastLogin: new Date(),
      });

      await user.save();
      logInfo(`Created new user from ${provider}`);
    }

    user.lastLogin = new Date();
    await user.save();
    return user;
  } catch (error) {
    logError(`Error in findOrCreateUser (${provider}): ${(error as Error).message}`);
    throw error;
  }
};

//
// ✅ Google Strategy
//
if (socialConfig.providers.google.clientId && socialConfig.providers.google.clientSecret) {
  const googleCallbackURL = process.env.NODE_ENV === 'production' 
    ? 'https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback'
    : socialConfig.redirectUrIs.google.callback;
    
  passport.use(new GoogleStrategy({
    clientID: socialConfig.providers.google.clientId,
    clientSecret: socialConfig.providers.google.clientSecret,
    callbackURL: googleCallbackURL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser(profile, 'google');
      return done(null, user);
    } catch (error) {
      logError(`Google OAuth error: ${(error as Error).message}`);
      return done(error, false);
    }
  }));
} else {
  logWarn('⚠️ Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

//
// ✅ Facebook Strategy
//
if (socialConfig.providers.facebook.appId && socialConfig.providers.facebook.appSecret) {
  const facebookCallbackURL = process.env.NODE_ENV === 'production' 
    ? 'https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback'
    : socialConfig.redirectUrIs.facebook.callback;
    
  passport.use(new FacebookStrategy({
    clientID: socialConfig.providers.facebook.appId,
    clientSecret: socialConfig.providers.facebook.appSecret,
    callbackURL: facebookCallbackURL,
    profileFields: ['id', 'name', 'photos', 'displayName'], // Removed 'emails' temporarily
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser(profile, 'facebook');
      return done(null, user);
    } catch (error) {
      logError(`Facebook OAuth error: ${(error as Error).message}`);
      return done(error, false);
    }
  }));
} else {
  logWarn('⚠️ Facebook OAuth not configured - missing APP_ID or APP_SECRET');
}





export default passport;
