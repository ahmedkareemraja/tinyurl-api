import { type CreateUserRequest } from '../../controllers/users/dto/request';
import { type UserResponse } from '../../controllers/users/dto/response';
import User, { type IUser } from '../../models/users/users.model';
import BaseError from '../../utils/BaseError';
import Encryption from '../../utils/encryption';

export default class UsersReporsitory {
  static async createUser(user: CreateUserRequest): Promise<void> {
    const newUser = new User(user);
    await newUser.save();
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId).lean();
  }

  static async getUserByIdWithRefreshToken(userId: string): Promise<IUser | null> {
    return await User.findById(userId).select('+refreshToken').lean();
  }

  static async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).lean();
  }

  // Never return the password hash and salt to the user
  static async getLoginUser(email: string, password: string): Promise<UserResponse> {
    const user = await User.findOne({ email }).select('+password +salt').lean();
    if (!user) {
      throw new BaseError('User not found', 404, { email });
    }

    if (!user.password || !user.salt) {
      throw new BaseError('Invalid credentials', 401, { email });
    }

    const isMatch = Encryption.comparePasswords(password, user.salt, user.password);

    if (!isMatch) {
      throw new BaseError('Invalid credentials', 401, { email });
    }

    const response = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      isDeleted: user.isDeleted,
    };
    return response;
  }

  static async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
  }): Promise<UserResponse> {
    let user = await User.findOne({ googleId: profile.googleId }).lean();

    if (!user) {
      const existingByEmail = await User.findOne({ email: profile.email });
      if (existingByEmail) {
        existingByEmail.googleId = profile.googleId;
        await existingByEmail.save({ validateModifiedOnly: true });
        user = existingByEmail.toObject();
      } else {
        const newUser = new User({
          fullName: profile.fullName,
          email: profile.email,
          googleId: profile.googleId,
        });
        await newUser.save({ validateModifiedOnly: true });
        user = newUser.toObject();
      }
    }

    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      isDeleted: user.isDeleted,
    };
  }

  static async updateRefreshToken(userId: string, refreshToken?: string): Promise<void> {
    if (typeof refreshToken === 'undefined') {
      await User.findByIdAndUpdate(
        userId,
        { $unset: { refreshToken: 1 } },
        { runValidators: true },
      );
      return;
    }

    await User.findByIdAndUpdate(userId, { refreshToken }, { runValidators: true });
  }
}
