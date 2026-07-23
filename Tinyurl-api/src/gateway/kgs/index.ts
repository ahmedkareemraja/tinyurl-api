import { BaseError } from 'shared';

const KGS_BASE_URL = process.env['KGS_BASE_URL'] ?? 'http://localhost:5001';
const KGS_REQUEST_TIMEOUT_MS = 5000;

interface NextKeyResponse {
  data: { key: string };
}

// Anti-corruption layer in front of kgs's HTTP api. This is only called when
// the redis pool (the fast path) is empty - it asks kgs to generate and
// persist a key on demand instead of the api blocking a redis connection
// while it waits for the async replenishment pipeline to catch up.
export default class KgsGateway {
  static async getNextKey(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KGS_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${KGS_BASE_URL}/api/v1/keys/next`, { signal: controller.signal });
    } catch (err) {
      throw new BaseError('No short keys available right now, please try again shortly', 503, {
        cause: err instanceof Error ? err.message : err,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new BaseError('No short keys available right now, please try again shortly', 503, {
        kgsStatus: response.status,
      });
    }

    const body = (await response.json()) as NextKeyResponse;
    return body.data.key;
  }
}
