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
    const response = await axios.post(`${API_URL}/auth/login`, { phone, password });
    return response.data.data; // { tokens, staff }
  } catch (error: any) {
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
      authorize: async (credentials) => {
        const res = await loginByPhone({
          phone: credentials?.phone!,
          password: credentials?.password!,
        });

        if (res?.tokens && res?.staff) {
          return {
            id: res.staff.id || res.staff.staff_id, // 🔑 Bắt buộc phải có id
            name: res.staff.name,
            email: res.staff.email,

            // 🟡 Custom thêm gì cũng được
            phone: res.staff.phone,
            role: res.staff.role,
            avatar: res.staff.avatar,
            zalo_id: res.staff.zalo_id,
            gender: res.staff.gender,
            address: res.staff.address,
            city: res.staff.city,
            ward: res.staff.ward,
            status: res.staff.status,
            created_at: res.staff.created_at,

            tokens: {
              access_token: res.tokens.access_token,
              refresh_token: res.tokens.refresh_token,
            },
          };
        }

        throw new Error(res?.message || "Đăng nhập thất bại");
      }

    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // 🔑 Lần đầu đăng nhập thành công
      if (user && account?.provider === "credentials") {
        const userData = user as any;

        token.access_token = userData.tokens?.access_token;
        token.refresh_token = userData.tokens?.refresh_token;

        token.staffInfo = {
          name: userData.name || "",
          phone: userData.phone || "",
          email: userData.email || "",
          role: userData.role || "",
          avatar: userData.avatar || "",
          zalo_id: userData.zalo_id ?? null,
          gender: userData.gender || "",
          address: userData.address || "",
          city: userData.city || "",
          ward: userData.ward || "",
          status: userData.status || "",
          created_at: userData.created_at || "",
        };
      }

      // ✅ Nếu đã có staffInfo → giữ nguyên
      if (token.staffInfo) {
        return token;
      }

      // 🛠 Nếu chưa có hoặc bị mất, cố gắng lấy lại
      if (token.access_token) {
        const profileRes = await getStaffInfo(token.access_token as string);
        if (!profileRes.error) {
          token.staffInfo = profileRes.data.staff;
          return token;
        }

        // 🧪 Nếu access token hết hạn → thử refresh token
        const refreshRes = await refreshToken(token.refresh_token as string);
        if (!refreshRes.error) {
          const newAccessToken = refreshRes.data.access_token;
          const staffInfo = await getStaffInfo(newAccessToken);

          if (!staffInfo.error) {
            token.staffInfo = staffInfo.data.staff;
            token.access_token = newAccessToken;
            return token;
          }
        }

        // ❌ Tất cả đều fail
      }

      return token;
    },


    async session({ session, token }) {
      // Gắn token vào session
      session.access_token = token.access_token as string;
      session.refresh_token = token.refresh_token as string;
      session.staffInfo = token.staffInfo;

      // Tuỳ chọn: merge vào session.user nếu muốn


      return session;
    },
  },
};
