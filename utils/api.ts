// API Configuration

const API_BASE_URL = 'https://backend-app-9rhz.onrender.com/api';
// const API_BASE_URL = 'http://192.168.29.111:3000/api';

// Types based on backend models
export interface Product {
  _id: string;
  name: string;
  brandId: string;
  brandName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  _id: string;
  name: string;
  productCount: number;
  image: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  brandName: string;
  unit: 'Pc' | 'Outer' | 'Case';
  quantity: number;
  productNotes?: string;
}

export interface Order {
  _id: string;
  counterName: string;
  bit: string;
  totalItems: number;
  totalAmount: number;
  date: string;
  time?: string;
  status: 'Pending' | 'Completed';
  orderNumber: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Retailer {
  _id: string;
  name: string;
  phone: string;
  bit: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalItems: number;
  pendingOrders: number;
  totalBits: number;
}

export interface PaginatedOrdersResponse {
  data: Order[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export interface OrdersPageParams {
  bit?: string;
  status?: string;
  search?: string;
  date?: string;
  limit?: number;
  skip?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export type PaginatedProductsResponse = PaginatedResponse<Product>;
export type PaginatedBrandsResponse = PaginatedResponse<Brand>;
export type PaginatedRetailersResponse = PaginatedResponse<Retailer>;

export interface BrandsPageParams {
  limit?: number;
  skip?: number;
}

export interface ProductsPageParams {
  brand?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface RetailersPageParams {
  bit?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface PendingOrderItem {
  productId: string;
  productName: string;
  brandName: string;
  unit: 'Pc' | 'Outer' | 'Case';
  totalQuantity: number;
  orderCount: number;
  orderNumbers: string[];
}

export interface PendingOrderItemsResponse {
  items: {
    Pc: PendingOrderItem[];
    Outer: PendingOrderItem[];
    Case: PendingOrderItem[];
  };
  totals: {
    Pc: number;
    Outer: number;
    Case: number;
    totalItems: number;
    totalOrders: number;
  };
}

// Generic API helper function
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

function normalizePaginatedResponse<T>(
  raw: PaginatedResponse<T> | T[],
  limit: number,
  skip: number
): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    const data = raw.slice(skip, skip + limit);
    return {
      data,
      total: raw.length,
      limit,
      skip,
      hasMore: skip + data.length < raw.length,
    };
  }

  const data = raw.data ?? [];
  return {
    data,
    total: raw.total ?? data.length,
    limit: raw.limit ?? limit,
    skip: raw.skip ?? skip,
    hasMore: raw.hasMore ?? false,
  };
}

// Product API functions
export const productAPI = {
  getPage: async (params: ProductsPageParams = {}): Promise<PaginatedProductsResponse> => {
    const urlParams = new URLSearchParams();
    if (params.brand && params.brand !== 'all') urlParams.append('brand', params.brand);
    if (params.search) urlParams.append('search', params.search);
    if (params.limit !== undefined) urlParams.append('limit', String(params.limit));
    if (params.skip !== undefined) urlParams.append('skip', String(params.skip));

    const limit = params.limit ?? 10;
    const skip = params.skip ?? 0;
    const queryString = urlParams.toString();
    const raw = await apiCall<PaginatedProductsResponse | Product[]>(
      `/products${queryString ? `?${queryString}` : ''}`
    );
    return normalizePaginatedResponse(raw, limit, skip);
  },

  getAll: async (brand?: string, search?: string): Promise<Product[]> => {
    const allProducts: Product[] = [];
    let skip = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const page = await productAPI.getPage({ brand, search, limit, skip });
      allProducts.push(...page.data);
      hasMore = page.hasMore;
      skip += limit;
    }

    return allProducts;
  },

  // Get product by ID
  getById: async (id: string): Promise<Product> => {
    return apiCall<Product>(`/products/${id}`);
  },

  // Create new product
  create: async (productData: {
    name: string;
    brandId: string;
    brandName: string;
  }): Promise<Product> => {
    return apiCall<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  // Update product
  update: async (id: string, productData: {
    name: string;
    brandId: string;
    brandName: string;
  }): Promise<Product> => {
    return apiCall<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  // Delete product
  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Get unique brand names for filtering
  getUniqueBrandNames: async (): Promise<string[]> => {
    return apiCall<string[]>('/products/brands/unique');
  },

  // Update product order
  updateOrder: async (productOrders: { productId: string; order: number }[]): Promise<{ message: string }> => {
    return apiCall<{ message: string }>('/products/order', {
      method: 'PUT',
      body: JSON.stringify({ productOrders }),
    });
  },
};

// Brand API functions
export const brandAPI = {
  getPage: async (params: BrandsPageParams = {}): Promise<PaginatedBrandsResponse> => {
    const urlParams = new URLSearchParams();
    if (params.limit !== undefined) urlParams.append('limit', String(params.limit));
    if (params.skip !== undefined) urlParams.append('skip', String(params.skip));

    const limit = params.limit ?? 10;
    const skip = params.skip ?? 0;
    const queryString = urlParams.toString();
    const raw = await apiCall<PaginatedBrandsResponse | Brand[]>(
      `/brands${queryString ? `?${queryString}` : ''}`
    );
    return normalizePaginatedResponse(raw, limit, skip);
  },

  // Get all brands (loops pages for screens that need the full list)
  getAll: async (): Promise<Brand[]> => {
    const allBrands: Brand[] = [];
    let skip = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const page = await brandAPI.getPage({ limit, skip });
      allBrands.push(...page.data);
      hasMore = page.hasMore;
      skip += limit;
    }

    return allBrands;
  },

  // Get brand by ID
  getById: async (id: string): Promise<Brand> => {
    return apiCall<Brand>(`/brands/${id}`);
  },

  // Create new brand
  create: async (brandData: {
    name: string;
    image?: string;
  }): Promise<Brand> => {
    return apiCall<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify(brandData),
    });
  },

  // Update brand
  update: async (id: string, brandData: {
    name: string;
    image?: string;
  }): Promise<Brand> => {
    return apiCall<Brand>(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(brandData),
    });
  },

  // Delete brand
  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/brands/${id}`, {
      method: 'DELETE',
    });
  },

  // Cleanup empty brands (manually trigger cleanup)
  cleanup: async (): Promise<{ message: string }> => {
    return apiCall<{ message: string }>('/brands/cleanup', {
      method: 'POST',
    });
  },

  // Update brand order
  updateOrder: async (brandOrders: { brandId: string; order: number }[]): Promise<{ message: string }> => {
    return apiCall<{ message: string }>('/brands/order', {
      method: 'PUT',
      body: JSON.stringify({ brandOrders }),
    });
  },
};

// Order API functions
export const orderAPI = {
  getPage: async (params: OrdersPageParams = {}): Promise<PaginatedOrdersResponse> => {
    const urlParams = new URLSearchParams();
    if (params.bit && params.bit !== 'all') urlParams.append('bit', params.bit);
    if (params.status && params.status !== 'all') urlParams.append('status', params.status);
    if (params.date && params.date !== 'all') urlParams.append('date', params.date);
    if (params.search) urlParams.append('search', params.search);
    if (params.limit !== undefined) urlParams.append('limit', String(params.limit));
    if (params.skip !== undefined) urlParams.append('skip', String(params.skip));

    const queryString = urlParams.toString();
    return apiCall<PaginatedOrdersResponse>(`/orders${queryString ? `?${queryString}` : ''}`);
  },

  // Get order by ID
  getById: async (id: string): Promise<Order> => {
    return apiCall<Order>(`/orders/${id}`);
  },

  // Create new order
  create: async (orderData: {
    counterName: string;
    bit: string;
    totalItems: number;
    totalAmount: number;
    items?: OrderItem[];
    orderDate?: string;
  }): Promise<Order> => {
    return apiCall<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // Update order
  update: async (id: string, orderData: Partial<Order>): Promise<Order> => {
    return apiCall<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  },

  // Update order status
  updateStatus: async (id: string, status: 'Pending' | 'Completed'): Promise<Order> => {
    return apiCall<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete order
  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    return apiCall<DashboardStats>('/orders/stats/dashboard');
  },

  // Get recent orders
  getRecent: async (limit: number = 3): Promise<Order[]> => {
    return apiCall<Order[]>(`/orders/recent/${limit}`);
  },

  getCleanupPreview: async (): Promise<{ count: number }> => {
    return apiCall<{ count: number }>('/orders/cleanup/preview');
  },

  cleanupOldCompleted: async (): Promise<{ message: string; deletedCount: number }> => {
    return apiCall<{ message: string; deletedCount: number }>('/orders/cleanup/old-completed', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // Get pending order items grouped by unit type
  getPendingItems: async (brand?: string, bit?: string): Promise<PendingOrderItemsResponse> => {
    const params = new URLSearchParams();
    if (brand && brand !== 'all') params.append('brand', brand);
    if (bit && bit !== 'all') params.append('bit', bit);
    
    const queryString = params.toString();
    return apiCall<PendingOrderItemsResponse>(`/orders/pending-items${queryString ? `?${queryString}` : ''}`);
  },
};

// Retailer API functions
export const retailerAPI = {
  getPage: async (params: RetailersPageParams = {}): Promise<PaginatedRetailersResponse> => {
    const urlParams = new URLSearchParams();
    if (params.bit && params.bit !== 'all') urlParams.append('bit', params.bit);
    if (params.search) urlParams.append('search', params.search);
    if (params.limit !== undefined) urlParams.append('limit', String(params.limit));
    if (params.skip !== undefined) urlParams.append('skip', String(params.skip));

    const queryString = urlParams.toString();
    return apiCall<PaginatedRetailersResponse>(`/retailers${queryString ? `?${queryString}` : ''}`);
  },

  getAll: async (bit?: string, search?: string): Promise<Retailer[]> => {
    const allRetailers: Retailer[] = [];
    let skip = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const page = await retailerAPI.getPage({ bit, search, limit, skip });
      allRetailers.push(...page.data);
      hasMore = page.hasMore;
      skip += limit;
    }

    return allRetailers;
  },

  // Get retailer by ID
  getById: async (id: string): Promise<Retailer> => {
    return apiCall<Retailer>(`/retailers/${id}`);
  },

  // Create new retailer
  create: async (retailerData: {
    name: string;
    phone: string;
    bit: string;
  }): Promise<Retailer> => {
    return apiCall<Retailer>('/retailers', {
      method: 'POST',
      body: JSON.stringify(retailerData),
    });
  },

  // Update retailer
  update: async (id: string, retailerData: {
    name: string;
    phone: string;
    bit: string;
  }): Promise<Retailer> => {
    return apiCall<Retailer>(`/retailers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(retailerData),
    });
  },

  // Delete retailer
  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/retailers/${id}`, {
      method: 'DELETE',
    });
  },

  // Get unique bits for filtering
  getUniqueBits: async (): Promise<string[]> => {
    return apiCall<string[]>('/retailers/bits/unique');
  },

  // Get retailers by specific bit
  getByBit: async (bit: string): Promise<Retailer[]> => {
    return apiCall<Retailer[]>(`/retailers/bit/${bit}`);
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{
    status: string;
    uptime: number;
    timestamp: string;
  }> => {
    return apiCall('/health');
  },
};

// Combined API object for easy imports
export const api = {
  products: productAPI,
  brands: brandAPI,
  orders: orderAPI,
  retailers: retailerAPI,
  health: healthAPI,
};

export default api;
