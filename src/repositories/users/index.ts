import { type CreateUserRequest } from '../../controllers/users/dto/request';
import User, { type IUser } from '../../models/users/users.model';

export default class UsersReporsitory {
  static async createUser(user: CreateUserRequest): Promise<void> {
    const newUser = new User(user);
    await newUser.save();
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId).lean();
  }
}
