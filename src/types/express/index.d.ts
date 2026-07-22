import { type UserResponse } from '../../controllers/users/dto/response';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserResponse {}
  }
}

export {};
