import mongoose from 'mongoose';

export interface IKey {
  _id: mongoose.Types.ObjectId;
  key: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
}

const keySchema = new mongoose.Schema<IKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedBy: {
      type: String,
      required: false,
      index: true,
    },
    usedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const Key = mongoose.model<IKey>('Key', keySchema);

export default Key;
