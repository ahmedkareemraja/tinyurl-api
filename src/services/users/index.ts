import { type CreateUserRequest } from '../../controllers/users/dto/request';
import { type UserResponse } from '../../controllers/users/dto/response';
import UsersReporsitory from '../../repositories/users';
import BaseError from '../../utils/BaseError';
import Encryption from '../../utils/encryption';

export default class UsersService {
  static async createUser(user: CreateUserRequest): Promise<void> {
    const existingUser = await UsersReporsitory.getUserByEmail(user.email);
    if (existingUser) {
      throw new BaseError('User already exists', 409, { email: user.email });
    }
    return await UsersReporsitory.createUser(user);
  }

  static async getUserById(userId: string) {
    return await UsersReporsitory.getUserById(userId);
  }

  static async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
  }): Promise<UserResponse> {
    return await UsersReporsitory.findOrCreateGoogleUser(profile);
  }

  static async issueTokens(user: UserResponse): Promise<UserResponse> {
    const tokenPayload = {
      userid: user._id,
      email: user.email,
      fullName: user.fullName,
    };
    const token = Encryption.generateToken(tokenPayload);
    const refreshToken = Encryption.generateRefreshToken(tokenPayload);

    await UsersReporsitory.updateRefreshToken(user._id, refreshToken);

    return { ...user, accessToken: token, refreshToken };
  }

  static async logout(userId: string): Promise<void> {
    await UsersReporsitory.updateRefreshToken(userId, undefined);
  }

  static async refreshTokens(refreshToken: string): Promise<UserResponse> {
    const payload = Encryption.verifyRefreshToken(refreshToken);

    const user = await UsersReporsitory.getUserByIdWithRefreshToken(payload.userid);
    if (!user || user.isDeleted) {
      throw new BaseError('User not found', 404);
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      // Stored token differs from the one presented: either it was already
      // rotated or revoked (logout), so treat this as a reuse attempt.
      await UsersReporsitory.updateRefreshToken(user._id.toString(), undefined);
      throw new BaseError('Invalid or expired refresh token', 401);
    }

    const userResponse: UserResponse = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      isDeleted: user.isDeleted,
    };

    return await UsersService.issueTokens(userResponse);
  }
}
