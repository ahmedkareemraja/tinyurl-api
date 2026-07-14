class BaseError extends Error {
  public statusCode: number;
  public data: Record<string, unknown>;

  constructor(
    message = 'Something went wrong',
    statusCode = 400,
    data: Record<string, unknown> = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export default BaseError;
