import { type CreateUserRequest } from '../../controllers/users/dto/request';
import UsersReporsitory from '../../repositories/users';

export default class UsersService {
  static async createUser(user: CreateUserRequest): Promise<void> {
    return await UsersReporsitory.createUser(user);
  }

  static async getUserById(userId: string) {
    return await UsersReporsitory.getUserById(userId);
  }
}
