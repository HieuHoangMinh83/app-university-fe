import apiClient from "@/lib/api-client";
import { Order } from "./orders";
import { PaginationParams, PaginatedResponse } from "./types";

export interface Client {
  id: string;
  name: string;
  phone: string;
  zaloId: string | null;
  point: number;
  address: string | null;
  avatar: string | null;
  spinCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
  orders?: Order[]; // Orders included when fetching by ID
}

export interface CreateClientDto {
  phone: string;
  name: string;
  zaloId?: string; // Optional - để cập nhật zaloId cho client đã có phone
  avatar?: string;
  address?: string;
}

export interface UpdateClientDto {
  name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export const clientsApi = {
  // Tạo client mới hoặc cập nhật zaloId (Admin only)
  // Logic: Nếu phone đã tồn tại và có zaloId → cập nhật zaloId
  //        Nếu phone chưa tồn tại → tạo client mới
  create: async (data: CreateClientDto): Promise<Client> => {
    const response = await apiClient.post("/clients", data);
    return response?.data?.data || response?.data;
  },

  // Lấy tất cả clients
  getAll: async (params?: PaginationParams): Promise<Client[] | PaginatedResponse<Client>> => {
    try {
      const response = await apiClient.get("/clients", { params });
      // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
      if (response?.data?.data?.data && response?.data?.data?.meta) {
        return response.data.data as PaginatedResponse<Client>;
      }
      // Check if response is direct paginated: { data: [...], meta: {...} }
      if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
        return response.data as PaginatedResponse<Client>;
      }
      // Fallback to non-paginated response
      const data = response?.data?.data || response?.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      // Nếu API không tồn tại, thử lấy từ orders
      if (error?.response?.status === 404) {
      const ordersResponse = await apiClient.get("/orders", { params });
      const ordersData = ordersResponse?.data?.data?.data || ordersResponse?.data?.data || ordersResponse?.data || [];
      const orders = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.data) ? ordersData.data : []);
      // Extract unique clients from orders
      const clientsMap = new Map<string, Client>();
      orders?.forEach?.((order: any) => {
        if (order?.client && !clientsMap.has(order?.client?.id)) {
          clientsMap.set(order?.client?.id, {
            ...order?.client,
            _count: {
              orders: 1,
            },
          });
        } else if (order?.client) {
          const existing = clientsMap.get(order?.client?.id);
          if (existing && existing?._count) {
            existing._count.orders += 1;
          }
        }
      });
        return Array.from(clientsMap.values());
      }
      throw error;
    }
  },

  // Lấy client theo ID
  getById: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response?.data?.data || response?.data;
  },

  // Cập nhật client
  update: async (id: string, data: UpdateClientDto): Promise<Client> => {
    const response = await apiClient.patch(`/clients/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa client (nếu có quyền)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },
};

