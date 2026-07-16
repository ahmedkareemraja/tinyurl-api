class BaseError extends Error {
  public statusCode: number;
  public data: unknown;

  constructor(message = 'Something went wrong', statusCode = 400, data: unknown = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export default BaseError;
