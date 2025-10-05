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

// Product API functions
export const productAPI = {
  // Get all products with optional filtering
  getAll: async (brand?: string, search?: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (brand && brand !== 'all') params.append('brand', brand);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    return apiCall<Product[]>(`/products${queryString ? `?${queryString}` : ''}`);
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
  // Get all brands
  getAll: async (): Promise<Brand[]> => {
    return apiCall<Brand[]>('/brands');
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
  // Get all orders with optional filtering
  getAll: async (bit?: string, status?: string, search?: string): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (bit && bit !== 'all') params.append('bit', bit);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    return apiCall<Order[]>(`/orders${queryString ? `?${queryString}` : ''}`);
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
};

// Retailer API functions
export const retailerAPI = {
  // Get all retailers with optional filtering
  getAll: async (bit?: string, search?: string): Promise<Retailer[]> => {
    const params = new URLSearchParams();
    if (bit && bit !== 'all') params.append('bit', bit);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    return apiCall<Retailer[]>(`/retailers${queryString ? `?${queryString}` : ''}`);
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
