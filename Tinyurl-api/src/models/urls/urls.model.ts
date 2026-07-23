import mongoose from 'mongoose';

export interface IUrl {
  _id: mongoose.Types.ObjectId;
  key: string;
  longUrl: string;
  userId?: mongoose.Types.ObjectId;
  isDeleted: boolean;
}

const urlSchema = new mongoose.Schema<IUrl>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    longUrl: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Url = mongoose.model<IUrl>('Url', urlSchema);

export default Url;
