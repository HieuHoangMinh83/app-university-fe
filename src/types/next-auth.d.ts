import NextAuth from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

export interface IStaff {
  name: string;
  phone: string;
  avatar: string;
  email: string;
  zalo_id: number | null;
  gender: string;
  address: string;
  city: string;
  ward: string;
  status: string;
  created_at: string;
  role: string;
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    access_token: string;
    staffInfo: IStaff;
  }
}

declare module "next-auth" {
  interface Session {
    access_token: string;
    staffInfo: IStaff;
  }
}
