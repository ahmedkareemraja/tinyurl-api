import { type Request, type Response, type NextFunction } from 'express';

import KeysService from '../../services/keys';

class KeysController {
  static async getNextKey(this: void, _req: Request, res: Response, next: NextFunction) {
    try {
      const key = await KeysService.generateSingleKey();
      res.status(201).json({ status: true, message: 'Key generated successfully', data: { key } });
    } catch (err) {
      next(err);
    }
  }
}

export default KeysController;
