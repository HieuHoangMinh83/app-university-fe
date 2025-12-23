import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export interface OrderItem {
  id: string;
  comboId: string;
  productId: string;
  quantity: number;
  price: number;
  combo: {
    id: string;
    name: string;
    price: number;
    promotionalPrice?: number | null;
    isPromotionActive?: boolean;
  };
  product: {
    id: string;
    name: string;
  };
  clientComboId: string | null;
}

export interface Order {
  id: string;
  clientId: string;
  voucherId: string | null;
  totalPrice: number;
  status: OrderStatus;
  items: OrderItem[];
  voucher: {
    id: string;
    name: string;
    type: "PERCENT" | "FIXED";
    price?: number;
    percent?: number;
  } | null;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  processedBy: {
    id: string;
    name: string;
    phone: string;
  } | null;
  createdAt: string;
}

export interface CreateOrderDto {
  items: Array<{
    comboId: string;
    quantity: number;
    clientComboId?: string;
  }>;
  voucherId?: string; // Deprecated: Dùng clientVoucherId thay thế
  clientVoucherId?: string; // ID của ClientVoucher trong ví của client
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface GetOrdersParams extends PaginationParams {
  clientId?: string;
  status?: OrderStatus;
}

export const ordersApi = {
  // Lấy tất cả orders (Admin only)
  getAll: async (params?: GetOrdersParams): Promise<Order[] | PaginatedResponse<Order>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetOrdersParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/orders", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
    // Xử lý response với cấu trúc: { data: { data: [...], pagination: {...} } }
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      const pagination = response.data.data.pagination;
      if (pagination) {
        return {
          data: response.data.data.data,
          meta: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
          }
        } as PaginatedResponse<Order>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data.data;
    }
    
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Order>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Order>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy order theo ID
  getById: async (id: string, clientId?: string): Promise<Order> => {
    const params = clientId ? { clientId } : {};
    const response = await apiClient.get(`/orders/${id}`, { params });
    return response?.data?.data || response?.data;
  },

  // Tạo order mới
  create: async (data: CreateOrderDto, clientId?: string): Promise<Order> => {
    const params = clientId ? { clientId } : {};
    const response = await apiClient.post("/orders", data, { params });
    return response?.data?.data || response?.data;
  },

  // Cập nhật trạng thái order
  updateStatus: async (id: string, data: UpdateOrderStatusDto): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/status`, data);
    return response?.data?.data || response?.data;
  },
};

