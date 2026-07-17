import { type UserResponse } from '../../controllers/users/dto/response';

declare global {
  namespace Express {
    interface Request {
      user?: UserResponse;
    }
  }
}

export {};
