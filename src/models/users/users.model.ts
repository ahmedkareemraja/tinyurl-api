import mongoose from 'mongoose';

import Encryption from '../../utils/encryption';

export interface IUser {
  fullName: string;
  email: string;
  password: string;
  salt: string;
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
      required: true,
      select: false,
    },
    salt: {
      type: String,
      required: true,
      select: false,
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
  if (!this.isModified('password')) return;

  const { salt, hash } = Encryption.createHashedPassword(this.password);
  this.salt = salt;
  this.password = hash;
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
