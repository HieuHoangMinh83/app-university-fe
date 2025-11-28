import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { getSession } from "next-auth/react";

// Helper function để tạo base URL đúng format: /api/v1
function getApiBaseUrl(): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }
  
  let baseUrl = API_URL.trim().replace(/\/$/, '');
  
  if (!baseUrl.includes('/api/v1')) {
    if (baseUrl.endsWith('/api')) {
      baseUrl = `${baseUrl}/v1`;
    } else {
      baseUrl = `${baseUrl}/api/v1`;
    }
  }
  
  return baseUrl;
}

// Tạo axios instance với interceptor để tự động thêm token
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor để thêm token
apiClient.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn, redirect về login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

