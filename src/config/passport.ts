import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import UsersRepository from '../repositories/users';
import BaseError from '../utils/BaseError';

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

export default passport;
