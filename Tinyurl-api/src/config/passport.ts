import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { BaseError, logger } from 'shared';

import UsersRepository from '../repositories/users';
import UsersService from '../services/users';

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email: string, password: string, done) => {
      try {
        const user = await UsersRepository.getLoginUser(email, password);
        return done(null, user);
      } catch (err) {
        if (err instanceof BaseError) {
          return done(null, false, { message: err.message });
        }
        return done(err);
      }
    },
  ),
);

const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_CALLBACK_URL } =
  process.env;

if (GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET && GOOGLE_OAUTH_CALLBACK_URL) {
  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_OAUTH_CLIENT_ID,
          clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
          callbackURL: GOOGLE_OAUTH_CALLBACK_URL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new BaseError('Google account has no email', 400));
            }
            const user = await UsersService.findOrCreateGoogleUser({
              googleId: profile.id,
              email,
              fullName: profile.displayName,
            });
            return done(null, user);
          } catch (err) {
            return done(err instanceof Error ? err : new Error(String(err)));
          }
        },
      ),
    );
  } catch (err) {
    logger.error('Error initializing Google OAuth strategy:', err);
  }
}

export default passport;
