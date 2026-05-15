export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN_PRODI"
  | "MAHASISWA"
  | "DOSEN"
  | "KAPRODI"
  | "TATA_USAHA";

export type UserProfile = {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
};

export type LoginResponseData = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};
