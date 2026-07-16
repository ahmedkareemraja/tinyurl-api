import { type LoginRequest, type CreateUserRequest } from '../../controllers/users/dto/request';
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

  static async loginUser(loginRequest: LoginRequest): Promise<UserResponse> {
    const user = await UsersReporsitory.getLoginUser(loginRequest.email, loginRequest.password);

    const tokenPayload = {
      userid: user._id,
      email: user.email,
      fullName: user.fullName,
    };
    const token = Encryption.generateToken(tokenPayload);
    const refreshToken = Encryption.generateRefreshToken(tokenPayload);

    return { ...user, accessToken: token, refreshToken };
  }
}
