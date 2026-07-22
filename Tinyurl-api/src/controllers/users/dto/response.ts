export interface UserResponse {
  _id: string;
  fullName: string;
  email: string;
  isDeleted: boolean;
  accessToken?: string;
  refreshToken?: string;
}
