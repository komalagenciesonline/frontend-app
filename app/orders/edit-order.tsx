import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand, Order, OrderItem, Product } from '../../utils/api';

export default function EditOrderScreen() {
  const router = useRouter();
  const { orderData } = useLocalSearchParams<{ 
    orderData: string;
  }>();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Parse order data from params
  React.useEffect(() => {
    if (orderData) {
      try {
        const parsedOrder = JSON.parse(orderData);
        setOrder(parsedOrder);
        setOrderItems(parsedOrder.items || []);
      } catch (error) {
        console.error('Error parsing order data:', error);
      }
    }
  }, [orderData]);

  // Load products and brands data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [productsData, brandsData] = await Promise.all([
          api.products.getAll(),
          api.brands.getAll()
        ]);
        setProducts(productsData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error loading products and brands:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);


  const getBrandProducts = (brandId: string) => {
    return products.filter(product => product.brandId === brandId);
  };

  const getBrandProductCount = (brandId: string) => {
    return products.filter(product => product.brandId === brandId).length;
  };

  const handleBrandPress = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsModalVisible(true);
  };

  const handleAddToOrder = (product: Product, unit: 'Pc' | 'Outer' | 'Case', quantity: number) => {
    setOrderItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.productId === product._id && item.unit === unit
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity = quantity;
        return updatedItems;
      } else {
        // Add new item
        const newItem: OrderItem = {
          productId: product._id,
          productName: product.name,
          brandName: selectedBrand?.name || 'Unknown Brand',
          unit,
          quantity
        };
        return [...prevItems, newItem];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, unit: 'Pc' | 'Outer' | 'Case', newQuantity: number) => {
    setOrderItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.productId === productId && item.unit === unit) {
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      });
      
      // Remove items with quantity 0
      return updatedItems.filter(item => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string, unit: 'Pc' | 'Outer' | 'Case') => {
    setOrderItems(prevItems => 
      prevItems.filter(item => !(item.productId === productId && item.unit === unit))
    );
  };

  const getTotalItems = () => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSaveOrder = async () => {
    if (!order) return;
    
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to your order before saving.');
      return;
    }

    setIsSaving(true);
    
    try {
      const totalItems = orderItems.reduce((total, item) => total + item.quantity, 0);
      
      await api.orders.update(order._id, {
        items: orderItems,
        totalItems: totalItems,
        // Update the order with current items
      });

      Alert.alert(
        'Order Updated!', 
        `Order ${order.orderNumber} has been updated successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to orders screen
              router.push('/(tabs)/orders');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Error', 'Failed to update order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!order) return;

    Alert.alert(
      'Mark Order as Completed',
      `Are you sure you want to mark order ${order.orderNumber} as completed?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setIsSaving(true);
            
            try {
              const totalItems = orderItems.reduce((total, item) => total + item.quantity, 0);
              
              await api.orders.update(order._id, {
                items: orderItems,
                totalItems: totalItems,
                status: 'Completed',
              });

              Alert.alert(
                'Order Completed!', 
                `Order ${order.orderNumber} has been marked as completed successfully.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to orders screen
                      router.push('/(tabs)/orders');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error completing order:', error);
              Alert.alert('Error', 'Failed to complete order. Please try again.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const ProductModal = () => {
    const [productSelections, setProductSelections] = useState<{[key: string]: {unit: 'Pc' | 'Outer' | 'Case', quantity: number}}>({});

    const handleUnitChange = (productId: string, unit: 'Pc' | 'Outer' | 'Case') => {
      setProductSelections(prev => ({
        ...prev,
        [productId]: {
          unit,
          quantity: prev[productId]?.quantity || 0
        }
      }));
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
      setProductSelections(prev => ({
        ...prev,
        [productId]: {
          unit: prev[productId]?.unit || 'Pc',
          quantity: Math.max(0, quantity)
        }
      }));
    };

    const handleAddSelected = () => {
      Object.entries(productSelections).forEach(([productId, selection]) => {
        if (selection.quantity > 0) {
          const product = products.find(p => p._id === productId);
          if (product) {
            handleAddToOrder(product, selection.unit, selection.quantity);
          }
        }
      });
      setIsModalVisible(false);
      setProductSelections({});
    };

    const brandProducts = selectedBrand ? getBrandProducts(selectedBrand._id) : [];

    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Products</Text>
            <TouchableOpacity onPress={handleAddSelected}>
              <Text style={styles.addButton}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Category Header */}
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{selectedBrand?.name}</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Products List */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {brandProducts.map((product) => (
              <View key={product._id} style={styles.productItem}>
                {/* Product Name */}
                <Text style={styles.productName}>{product.name}</Text>
                
                {/* Unit Selection and Quantity - Inline */}
                <View style={styles.productControls}>
                  {/* Unit Selection */}
                  <View style={styles.unitSelection}>
                    {(['Pc', 'Outer', 'Case'] as const).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitButton,
                          productSelections[product._id]?.unit === unit && styles.unitButtonSelected
                        ]}
                        onPress={() => handleUnitChange(product._id, unit)}
                      >
                        <Text style={[
                          styles.unitText,
                          productSelections[product._id]?.unit === unit && styles.unitTextSelected
                        ]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quantity Selection */}
                  <View style={styles.quantitySection}>
                    <TouchableOpacity
                      style={[
                        styles.quantityControls,
                        (productSelections[product._id]?.quantity || 0) > 0 && styles.quantityControlsSelected
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(product._id, (productSelections[product._id]?.quantity || 0) - 1)}
                      >
                        <Ionicons 
                          name="remove" 
                          size={16} 
                          color={(productSelections[product._id]?.quantity || 0) > 0 ? "#ffffff" : "#8B5CF6"} 
                        />
                      </TouchableOpacity>
                      <Text style={[
                        styles.quantityText,
                        (productSelections[product._id]?.quantity || 0) > 0 && styles.quantityTextSelected
                      ]}>
                        {productSelections[product._id]?.quantity || 0}
                      </Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(product._id, (productSelections[product._id]?.quantity || 0) + 1)}
                      >
                        <Ionicons 
                          name="add" 
                          size={16} 
                          color={(productSelections[product._id]?.quantity || 0) ? "#ffffff" : "#8B5CF6"} 
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const OrderItemCard = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItemCard}>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>{item.productName}</Text>
        <Text style={styles.orderItemBrand}>{item.brandName} • {item.unit}</Text>
      </View>
      
      <View style={styles.orderItemControls}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.productId, item.unit, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color="#8B5CF6" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.productId, item.unit, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.productId, item.unit)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const BrandCard = ({ brand }: { brand: Brand }) => (
    <TouchableOpacity 
      style={styles.brandCard}
      onPress={() => handleBrandPress(brand)}
    >
      <Image source={{ uri: brand.image }} style={styles.brandImage} />
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{brand.name}</Text>
        <Text style={styles.productCount}>{getBrandProductCount(brand._id)} Products</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Edit Order</Text>
        <View style={styles.headerActions}>
          {order?.status === 'Pending' && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleMarkAsCompleted}
              disabled={isSaving}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSaveOrder} disabled={isSaving}>
            <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Info Section */}
      <View style={styles.orderInfoSection}>
        <View style={styles.orderInfoHeader}>
          <Text style={styles.orderInfoTitle}>Order Details</Text>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        </View>
        
        <View style={styles.retailerInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="storefront-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Retailer Name:</Text>
            <Text style={styles.infoValue}>{order.counterName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Phone No:</Text>
            <Text style={styles.infoValue}>+91 9876543210</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Bit:</Text>
            <Text style={styles.infoValue}>{order.bit}</Text>
          </View>
        </View>
      </View>

      {/* Order Items Section */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Items ({orderItems.length})</Text>
        </View>
        
        <View style={styles.orderItemsList}>
          {orderItems.map((item, index) => (
            <OrderItemCard key={`${item.productId}-${item.unit}-${index}`} item={item} />
          ))}
        </View>


        {/* Brands List */}
        <View style={styles.brandsSection}>
          <Text style={styles.brandsTitle}>Available Brands</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading brands...</Text>
            </View>
          ) : (
            <View style={styles.brandsList}>
              {brands.map((brand) => (
                <BrandCard key={brand._id} brand={brand} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Summary */}
      {orderItems.length > 0 && (
        <View style={styles.bottomSummary}>
          <View style={styles.summaryContent}>
            <Ionicons name="cube-outline" size={20} color="#007AFF" />
            <Text style={styles.summaryText}>
              Total Items: {getTotalItems()} Updated
            </Text>
          </View>
        </View>
      )}

      <ProductModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    color: '#cccccc',
  },
  orderInfoSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  retailerInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  orderItemsList: {
    gap: 12,
    marginBottom: 20,
  },
  orderItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 14,
    color: '#666666',
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    paddingHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
  },
  brandsSection: {
    marginBottom: 20,
  },
  brandsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  brandsList: {
    gap: 12,
  },
  brandCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  brandImage: {
    width: 60,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    color: '#666666',
  },
  bottomSummary: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  // Modal Styles (same as new-order.tsx)
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#8B5CF6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  productItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  productControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitSelection: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unitButtonSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  unitTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  quantitySection: {
    alignItems: 'center',
  },
  quantityControlsSelected: {
    backgroundColor: '#8B5CF6',
  },
  quantityTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
