import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { api, Brand, Product } from '../../utils/api';

interface SelectedItem {
  productId: string;
  productName: string;
  brandName: string;
  unit: 'Pc' | 'Outer' | 'Case';
  quantity: number;
  productNotes?: string;
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { retailerName, retailerPhone, retailerBit } = useLocalSearchParams<{ 
    retailerName: string;
    retailerPhone: string;
    retailerBit: string;
  }>();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleAddToOrder = (product: Product, unit: 'Pc' | 'Outer' | 'Case', quantity: number, productNotes?: string) => {
    setSelectedItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.productId === product._id && item.unit === unit
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity = quantity;
        updatedItems[existingItemIndex].productNotes = productNotes || '';
        return updatedItems;
      } else {
        // Add new item
        const newItem: SelectedItem = {
          productId: product._id,
          productName: product.name,
          brandName: selectedBrand?.name || 'Unknown Brand',
          unit,
          quantity,
          productNotes: productNotes || ''
        };
        return [...prevItems, newItem];
      }
    });
  };

  const getTotalItems = () => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleNavigateToSummary = () => {
    router.push({
      pathname: '/orders/order-summary',
      params: {
        retailerName: retailerName || 'N/A',
        retailerPhone: retailerPhone || 'N/A',
        retailerBit: retailerBit || 'N/A',
        orderItems: JSON.stringify(selectedItems)
      }
    });
  };

  const handleDragEnd = async ({ data }: { data: Brand[] }) => {
    setBrands(data);
    setIsDragging(false);
    
    // Save the new order to backend
    try {
      const brandOrders = data.map((brand, index) => ({
        brandId: brand._id,
        order: index
      }));
      
      await api.brands.updateOrder(brandOrders);
    } catch (error) {
      console.error('Error updating brand order:', error);
      // Optionally show a toast or alert to user
    }
  };

  const handleDragBegin = () => {
    setIsDragging(true);
  };

  const ProductModal = () => {
    const [productSelections, setProductSelections] = useState<{[key: string]: {unit: 'Pc' | 'Outer' | 'Case', quantity: number, productNotes: string}}>({});

    const handleUnitChange = (productId: string, unit: 'Pc' | 'Outer' | 'Case') => {
      setProductSelections(prev => ({
        ...prev,
        [productId]: {
          unit,
          quantity: prev[productId]?.quantity || 0,
          productNotes: prev[productId]?.productNotes || ''
        }
      }));
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
      setProductSelections(prev => ({
        ...prev,
        [productId]: {
          unit: prev[productId]?.unit || 'Pc',
          quantity: Math.max(0, quantity),
          productNotes: prev[productId]?.productNotes || ''
        }
      }));
    };

    const handleNotesChange = (productId: string, productNotes: string) => {
      setProductSelections(prev => ({
        ...prev,
        [productId]: {
          unit: prev[productId]?.unit || 'Pc',
          quantity: prev[productId]?.quantity || 0,
          productNotes
        }
      }));
    };

    const handleAddSelected = () => {
      Object.entries(productSelections).forEach(([productId, selection]) => {
        if (selection.quantity > 0) {
          const product = products.find(p => p._id === productId);
          if (product) {
            handleAddToOrder(product, selection.unit, selection.quantity, selection.productNotes);
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
                          color={(productSelections[product._id]?.quantity || 0) > 0 ? "#ffffff" : "#8B5CF6"} 
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Notes Input */}
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes for this product..."
                    placeholderTextColor="#999"
                    value={productSelections[product._id]?.productNotes || ''}
                    onChangeText={(text) => handleNotesChange(product._id, text)}
                    multiline
                    numberOfLines={2}
                    maxLength={500}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const BrandCard = ({ brand, drag, isActive }: { brand: Brand; drag: () => void; isActive: boolean }) => (
    <TouchableOpacity 
      style={[
        styles.brandCard,
        isActive && styles.brandCardDragging
      ]}
      onPress={() => !isActive && handleBrandPress(brand)}
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
      
      <Image source={{ uri: brand.image }} style={styles.brandImage} />
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{brand.name}</Text>
        <Text style={styles.productCount}>{brand.productCount || getBrandProductCount(brand._id)} Products</Text>
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
        <Text style={styles.headerTitle}>New Order</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeIconContainer}>
            <Ionicons name="storefront" size={32} color="#007AFF" />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeGreeting}>Welcome back!</Text>
            <Text style={styles.welcomeText}>
              {retailerName || 'Retailer'}
            </Text>
            <Text style={styles.subtitleText}>
              Select a brand to start creating your order
            </Text>
          </View>
        </View>
      </View>

      {/* Brands Section */}
      <View style={styles.brandsContainer}>
        <View style={styles.brandsHeader}>
          <Text style={styles.brandsTitle}>
            Available Brands ({brands.length})
          </Text>
          {isDragging && (
            <Text style={styles.dragHint}>Drag to reorder brands</Text>
          )}
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading brands...</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={brands}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item._id}
            renderItem={({ item, drag, isActive }: RenderItemParams<Brand>) => (
              <BrandCard 
                brand={item} 
                drag={drag} 
                isActive={isActive} 
              />
            )}
            contentContainerStyle={styles.brandsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bottom Summary */}
      {selectedItems.length > 0 && (
        <TouchableOpacity style={styles.bottomSummary} onPress={handleNavigateToSummary}>
          <View style={styles.summaryContent}>
            <Ionicons name="cube-outline" size={20} color="#007AFF" />
            <Text style={styles.summaryText}>
              Total Items: {getTotalItems()} Added
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
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
  },
  placeholder: {
    width: 34,
  },
  welcomeSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 20,
  },
  brandsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  brandsHeader: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dragHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  brandsList: {
    gap: 12,
    paddingBottom: 20,
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
  brandCardDragging: {
    backgroundColor: '#f0f8ff',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  // Modal Styles
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
    backgroundColor: '#8B5CF6', // Purple header like in image
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
    color: '#8B5CF6', // Purple brand name
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
  quantityControlsSelected: {
    backgroundColor: '#8B5CF6',
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
  quantityTextSelected: {
    color: '#ffffff',
  },
  notesSection: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});