import Joi from 'joi';
import { BaseError } from 'shared';

import { type CreateUrlRequest } from '../../controllers/urls/dto/request';

class UrlsUtils {
  static validateCreateUrl(body: unknown): CreateUrlRequest {
    const createUrlSchema = Joi.object({
      longUrl: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
    });

    const result = createUrlSchema.validate(body);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, body);
    }
    return result.value as CreateUrlRequest;
  }

  static validateKey(key: unknown): string {
    const keySchema = Joi.string().alphanum().required();
    const result = keySchema.validate(key);
    if (result.error) {
      throw new BaseError(`Validation error: ${result.error.details[0]?.message}`, 400, key);
    }
    return result.value;
  }
}

export default UrlsUtils;
