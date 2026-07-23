import { type Request, type Response, type NextFunction } from 'express';
import { BaseError } from 'shared';

import UrlsService from '../../services/urls';
import UrlsUtils from '../../utils/urls';

class UrlsController {
  static async shorten(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = UrlsUtils.validateCreateUrl(req.body);
      const url = await UrlsService.shortenUrl(validatedBody, req.user?._id);
      res.status(201).json({ status: true, message: 'URL shortened successfully', data: url });
    } catch (err) {
      next(err);
    }
  }

  static async getUserUrls(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new BaseError('User not authenticated', 401);
      }
      const urls = await UrlsService.getUrlsForUser(req.user._id);
      res.status(200).json({ status: true, message: 'URLs fetched successfully', data: urls });
    } catch (err) {
      next(err);
    }
  }

  static async redirect(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const key = UrlsUtils.validateKey(req.params['key']);
      const url = await UrlsService.resolveUrl(key);
      res.redirect(url.longUrl);
    } catch (err) {
      next(err);
    }
  }
}

export default UrlsController;
