import { type Request, type Response, type NextFunction } from 'express';

import type BaseError from '../utils/BaseError';

const errorHandler = (err: BaseError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = res.statusCode ? res.statusCode : 500;

  res.status(statusCode);

  res.json({
    message: err.message,
    stack: err.stack,
  });
};

export default errorHandler;
