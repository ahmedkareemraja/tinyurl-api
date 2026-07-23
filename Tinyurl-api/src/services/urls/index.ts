import {
  redisClient,
  BaseError,
  JOB_NAMES,
  QUEUE_NAMES,
  REDIS_KEY_POOL_NAME,
  KEY_POOL_LOW_WATERMARK,
  KEY_GENERATION_BATCH_SIZE,
} from 'shared';

import { type CreateUrlRequest } from '../../controllers/urls/dto/request';
import { type UrlResponse } from '../../controllers/urls/dto/response';
import KgsGateway from '../../gateway/kgs';
import { type IUrl } from '../../models/urls/urls.model';
import messagePublisher from '../../queue';
import UrlsRepository from '../../repositories/urls';

export default class UrlsService {
  static async shortenUrl(data: CreateUrlRequest, userId?: string): Promise<UrlResponse> {
    const key = await UrlsService.popKeyFromPool();

    const url = await UrlsRepository.createUrl({ key, longUrl: data.longUrl, userId });

    await messagePublisher.publish(QUEUE_NAMES.KEY_EVENTS, JOB_NAMES.MARK_KEY_USED, {
      key,
      userId,
    });

    const remainingKeys = await redisClient.lLen(REDIS_KEY_POOL_NAME);
    if (remainingKeys < KEY_POOL_LOW_WATERMARK) {
      await messagePublisher.publish(QUEUE_NAMES.KEY_GENERATION, JOB_NAMES.GENERATE_KEYS, {
        count: KEY_GENERATION_BATCH_SIZE,
      });
    }

    return UrlsService.toResponse(url);
  }

  static async getUrlsForUser(userId: string): Promise<UrlResponse[]> {
    const urls = await UrlsRepository.getUrlsByUser(userId);
    return urls.map((url) => UrlsService.toResponse(url));
  }

  static async resolveUrl(key: string): Promise<IUrl> {
    const url = await UrlsRepository.getUrlByKey(key);
    if (!url) {
      throw new BaseError('Short URL not found', 404, { key });
    }
    return url;
  }

  // Pops a key from the redis pool - the fast path for almost every request.
  // If the pool is empty, this asks kgs to replenish it in the background
  // (for future requests) and falls back to asking kgs directly for a
  // single key on demand, rather than blocking a redis connection waiting
  // for the pool to be refilled.
  private static async popKeyFromPool(): Promise<string> {
    const key = await redisClient.lPop(REDIS_KEY_POOL_NAME);
    if (key) return key;

    await messagePublisher.publish(QUEUE_NAMES.KEY_GENERATION, JOB_NAMES.GENERATE_KEYS, {
      count: KEY_GENERATION_BATCH_SIZE,
    });

    return await KgsGateway.getNextKey();
  }

  private static toResponse(url: IUrl): UrlResponse {
    const base = process.env['SHORT_URL_BASE_URL'] ?? '';
    return {
      _id: url._id.toString(),
      key: url.key,
      shortUrl: `${base}/${url.key}`,
      longUrl: url.longUrl,
      userId: url.userId?.toString(),
    };
  }
}
