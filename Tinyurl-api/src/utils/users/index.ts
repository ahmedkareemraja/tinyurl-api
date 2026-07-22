import Joi from 'joi';

import {
  type LoginRequest,
  type CreateUserRequest,
  type RefreshTokenRequest,
} from '../../controllers/users/dto/request';
import BaseError from '../BaseError';

class UsersUtils {
  static validateCreateUser(body: unknown): CreateUserRequest {
    const createUserSchema = Joi.object({
      fullName: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(5).required(),
    });

    const result = createUserSchema.validate(body);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, body);
    }
    return result.value as CreateUserRequest;
  }

  static validateUserId(userId: unknown): string {
    const userIdSchema = Joi.string().length(24).hex().required();
    const result = userIdSchema.validate(userId);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, userId);
    }
    return result.value;
  }

  static validateLoginRequest(body: unknown): LoginRequest {
    const loginRequestSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(5).required(),
    });
    const result = loginRequestSchema.validate(body);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, body);
    }
    return result.value as LoginRequest;
  }

  static validateRefreshTokenRequest(body: unknown): RefreshTokenRequest {
    const refreshTokenSchema = Joi.object({
      refreshToken: Joi.string().required(),
    });
    const result = refreshTokenSchema.validate(body);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, body);
    }
    return result.value as RefreshTokenRequest;
  }
}

export default UsersUtils;
