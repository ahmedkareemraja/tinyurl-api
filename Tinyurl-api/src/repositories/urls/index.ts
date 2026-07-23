import Url, { type IUrl } from '../../models/urls/urls.model';

export default class UrlsRepository {
  static async createUrl(data: { key: string; longUrl: string; userId?: string }): Promise<IUrl> {
    const url = new Url(data);
    await url.save();
    return url.toObject();
  }

  static async getUrlByKey(key: string): Promise<IUrl | null> {
    return await Url.findOne({ key, isDeleted: false }).lean();
  }

  static async getUrlsByUser(userId: string): Promise<IUrl[]> {
    return await Url.find({ userId, isDeleted: false }).sort({ createdAt: -1 }).lean();
  }
}
