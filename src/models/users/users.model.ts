import mongoose from 'mongoose';

import Encryption from '../../utils/encryption';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  salt?: string;
  googleId?: string;
  refreshToken?: string;
  isDeleted: boolean;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      select: false,
    },
    salt: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      select: false,
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    refreshToken: {
      type: String,
      required: false,
      select: false,
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

userSchema.pre('validate', function () {
  if (!this.isModified('password') || !this.password) return;

  const { salt, hash } = Encryption.createHashedPassword(this.password);
  this.salt = salt;
  this.password = hash;
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
