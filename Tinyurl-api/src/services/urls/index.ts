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
import { type IUrl } from '../../models/urls/urls.model';
import messagePublisher from '../../queue';
import getBlockingRedisClient from '../../redis/blockingClient';
import UrlsRepository from '../../repositories/urls';

// How long to wait for kgs to replenish the pool before giving up.
const KEY_WAIT_TIMEOUT_SECONDS = 10;

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

  // Pops a key from the pool, requesting generation and waiting for a fresh
  // one to arrive if the pool is currently empty rather than failing outright.
  private static async popKeyFromPool(): Promise<string> {
    const key = await redisClient.lPop(REDIS_KEY_POOL_NAME);
    if (key) return key;

    await messagePublisher.publish(QUEUE_NAMES.KEY_GENERATION, JOB_NAMES.GENERATE_KEYS, {
      count: KEY_GENERATION_BATCH_SIZE,
    });

    const blockingClient = await getBlockingRedisClient();
    const result = await blockingClient.blPop(REDIS_KEY_POOL_NAME, KEY_WAIT_TIMEOUT_SECONDS);
    if (!result) {
      throw new BaseError('No short keys available right now, please try again shortly', 503);
    }

    return result.element;
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
