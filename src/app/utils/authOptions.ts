import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper function để tạo base URL đúng format: /api/v1
function getApiBaseUrl(): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }
  
  let baseUrl = API_URL.trim().replace(/\/$/, ''); // Xóa trailing slash
  
  // Nếu baseUrl chưa có /api/v1 thì thêm vào
  if (!baseUrl.includes('/api/v1')) {
    if (baseUrl.endsWith('/api')) {
      baseUrl = `${baseUrl}/v1`;
    } else {
      baseUrl = `${baseUrl}/api/v1`;
    }
  }
  
  return baseUrl;
}

export async function loginByPhone({
  phone,
  password,
}: {
  phone: string;
  password: string;
}) {
  try {
    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}/auth/login/user`;
    
    const response = await axios.post(endpoint, { phone, password });
    
    // Kiểm tra response structure
    if (response?.data?.data) {
      return response?.data?.data; // { user, access_token }
    }
    
    // Nếu response không đúng format
    return {
      error: true,
      message: "Response format không đúng",
    };
  } catch (error: any) {
    console.error('Login error:', {
      url: error?.config?.url,
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message
    });
    
    // Xử lý các loại lỗi khác nhau
    if (error?.response?.data) {
      const errorData = error?.response?.data;
      
      // Lỗi từ server (400, 401, etc.)
      if (errorData?.message) {
        return {
          error: true,
          message: errorData.message,
        };
      }
    }
    
    // Lỗi network hoặc lỗi khác
    return {
      error: true,
      message: error?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.",
    };
  }
}

export async function getStaffInfo(accessToken: string) {
  try {
    const baseUrl = getApiBaseUrl();
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const response: AxiosResponse = await axios.get(`${baseUrl}/auth/profile`, config);
    return { data: response?.data, error: false };
  } catch (error: any) {
    return {
      error: true,
      message: error?.response?.data?.message || "Không thể lấy thông tin nhân viên",
    };
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/auth/login" },
  session: { 
    strategy: "jwt",
    maxAge: 15 * 24 * 60 * 60, // 15 ngày (tính bằng giây)
  },

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

        if (res?.user && res?.access_token) {
          return {
            id: res?.user?.id, // 🔑 Bắt buộc phải có id
            name: res?.user?.name,
            phone: res?.user?.phone,
            avatar: res?.user?.avatar || null,
            isActive: res?.user?.isActive,
            role: res?.user?.role?.name || res?.user?.role, // role có thể là object {id, name} hoặc string
            createdAt: res?.user?.createdAt,

            tokens: {
              access_token: res?.access_token,
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

        token.access_token = userData?.tokens?.access_token;

        token.staffInfo = {
          name: userData?.name || "",
          phone: userData?.phone || "",
          email: "", // API mới không có email
          role: typeof userData?.role === 'object' ? userData?.role?.name : userData?.role || "",
          avatar: userData?.avatar || "",
          zalo_id: null, // API mới không có zalo_id cho user
          gender: "", // API mới không có gender
          address: "", // API mới không có address
          city: "", // API mới không có city
          ward: "", // API mới không có ward
          status: userData?.isActive ? "active" : "inactive",
          created_at: userData?.createdAt || "",
        };
      }

      // ✅ Nếu đã có staffInfo → giữ nguyên
      if (token?.staffInfo) {
        return token;
      }

      // 🛠 Nếu chưa có hoặc bị mất, cố gắng lấy lại
      if (token?.access_token) {
        const profileRes = await getStaffInfo(token.access_token as string);
        if (!profileRes?.error) {
          token.staffInfo = profileRes?.data?.staff;
          return token;
        }
        // ❌ Nếu access token hết hạn → user cần đăng nhập lại
      }

      return token;
    },


    async session({ session, token }) {
      // Gắn token vào session
      session.access_token = token?.access_token as string;
      session.staffInfo = token?.staffInfo;

      return session;
    },
  },
};
