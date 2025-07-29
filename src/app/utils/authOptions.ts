import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function loginByPhone({
  phone,
  password,
}: {
  phone: string;
  password: string;
}) {
  try {


    const response = await axios.post(`${API_URL}/auth/login`, {
      phone,
      password,
    });

    return response.data.data; // { tokens, staff }
  } catch (error: any) {
    console.error("API error:", error.response?.data || error.message);
    return {
      error: true,
      message: error?.response?.data?.message || "Đăng nhập thất bại",
    };
  }
}

export async function getStaffInfo(accessToken: string) {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const response: AxiosResponse = await axios.get(`${API_URL}/auth/profile`, config);
    return { data: response.data, error: false };
  } catch (error: any) {
    return {
      error: true,
      message: error?.response?.data?.message || "Không thể lấy thông tin nhân viên",
    };
  }
}

export async function refreshToken(refresh_token: string) {
  try {
    const response: AxiosResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken: refresh_token,
    });
    return { data: response.data, error: false };
  } catch (error: any) {
    return {
      error: true,
      message: error?.response?.data?.message || "Refresh token thất bại",
    };
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/auth/login" },
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await loginByPhone({
            phone: credentials?.phone!,
            password: credentials?.password!,
          });

          if (res?.tokens && res?.staff) {
            return {
              ...res.staff,
              tokens: {
                access_token: res.tokens.access_token,
                refresh_token: res.tokens.refresh_token,
              },
            };
          } else {
            throw new Error(res?.message);
          }
        } catch (err) {

          throw new Error(err as string);

        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "signIn" && account?.provider === "credentials") {
        // Lưu token lần đầu khi login
        console.warn("run test")
        // @ts-ignore
        token.access_token = user?.tokens?.access_token;
        // @ts-ignore
        token.refresh_token = user?.tokens?.refresh_token;
        // @ts-ignore
        token.staff = user?.staff;
      } else if (trigger === "update" && session?.name) {
        token.staff.name = session.name;
      } else {
        // Khi rehydrate lại session
        const response = await getStaffInfo(token.access_token as string);
        if (!response.error) {
          token.staff = response.data.staff;
        } else {
          const responseReset = await refreshToken(token.refresh_token as string);

          if (!responseReset.error) {
            const accessToken = responseReset.data.access_token;
            const staffInfo = await getStaffInfo(accessToken);

            if (!staffInfo.error) {
              token.staff = staffInfo.data.staff;
              token.access_token = accessToken;
            } else {
              throw new Error("Không thể load lại thông tin nhân viên sau khi refresh token.");
            }
          } else {
            throw new Error(responseReset.message);
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        if (token.access_token) {
          session.access_token = token.access_token;
        }
        if (token.refresh_token) {
          session.refresh_token = token.refresh_token;
        }
        if (token.staff) {
          session.staff = token.staff;
        }
        return session;
      } else {
        throw new Error("Lỗi không xác định khi tạo session");
      }
    },
  },
};
