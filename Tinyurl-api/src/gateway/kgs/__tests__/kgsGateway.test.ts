jest.mock('shared', () => {
  class BaseError extends Error {
    statusCode: number;
    data: unknown;

    constructor(message = 'Something went wrong', statusCode = 400, data: unknown = {}) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  }

  return { BaseError };
});

import KgsGateway from '..';

const mockedFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockedFetch;
});

describe('KgsGateway.getNextKey', () => {
  it('returns the key kgs generated', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { key: 'abc1234' } }),
    });

    const key = await KgsGateway.getNextKey();

    expect(key).toBe('abc1234');
    const [url] = mockedFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/keys/next');
  });

  it('throws a 503 when kgs responds with a non-ok status', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(KgsGateway.getNextKey()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('throws a 503 when the request to kgs fails outright', async () => {
    mockedFetch.mockRejectedValue(new Error('connection refused'));

    await expect(KgsGateway.getNextKey()).rejects.toMatchObject({ statusCode: 503 });
  });
});
