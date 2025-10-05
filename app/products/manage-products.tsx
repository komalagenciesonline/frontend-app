import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { api, Brand, Product } from '../../utils/api';

export default function ManageProductsScreen() {
  const router = useRouter();
  const { brandId, brandName } = useLocalSearchParams<{ 
    brandId: string;
    brandName: string;
  }>();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Load products for the specific brand
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const allProducts = await api.products.getAll();
      const brandProducts = allProducts.filter(product => product.brandId === brandId);
      setProducts(brandProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDragEnd = async ({ data }: { data: Product[] }) => {
    setProducts(data);
    setIsDragging(false);
    
    // Save the new order to backend
    try {
      const productOrders = data.map((product, index) => ({
        productId: product._id,
        order: index
      }));
      
      await api.products.updateOrder(productOrders);
    } catch (error) {
      console.error('Error updating product order:', error);
      // Optionally show a toast or alert to user
    }
  };

  const handleDragBegin = () => {
    setIsDragging(true);
  };

  const ProductCard = ({ product, drag, isActive }: { 
    product: Product; 
    drag: () => void; 
    isActive: boolean;
  }) => (
    <TouchableOpacity 
      style={[
        styles.productCard,
        isActive && styles.productCardDragging
      ]}
      disabled={isActive}
    >
      <TouchableOpacity 
        style={styles.dragHandle}
        onPressIn={drag}
        disabled={isActive}
      >
        <Ionicons 
          name="reorder-three-outline" 
          size={24} 
          color={isActive ? "#007AFF" : "#999"} 
        />
      </TouchableOpacity>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productBrand}>{product.brandName}</Text>
      </View>
      
      {!isActive && (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Products</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Brand Info */}
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{brandName}</Text>
        <Text style={styles.productCount}>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </Text>
      </View>

      {/* Products Section */}
      <View style={styles.productsContainer}>
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>
            Products ({products.length})
          </Text>
          {isDragging && (
            <Text style={styles.dragHint}>Drag to reorder products</Text>
          )}
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : products.length > 0 ? (
          <DraggableFlatList
            data={products}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item._id}
            renderItem={({ item, drag, isActive }: RenderItemParams<Product>) => (
              <ProductCard 
                product={item} 
                drag={drag}
                isActive={isActive} 
              />
            )}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              Add some products to this brand to get started
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },
  brandInfo: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productCount: {
    fontSize: 16,
    color: '#666666',
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  productsHeader: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dragHint: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  productsList: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productCardDragging: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  dragHandle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  productBrand: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
});
