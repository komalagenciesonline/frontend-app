import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand, Order, OrderItem, Product } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';
import { colors, fonts } from '../../../constants/theme';

export default function EditOrderScreen() {
  const router = useRouter();
  const { orderData, bitsFilter, statusFilter, dateFilter, searchQuery } = useLocalSearchParams<{ 
    orderData: string;
    bitsFilter?: string;
    statusFilter?: string;
    dateFilter?: string;
    searchQuery?: string;
  }>();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Parse order data from params
  React.useEffect(() => {
    if (orderData) {
      try {
        const parsedOrder = JSON.parse(orderData);
        setOrder(parsedOrder);
        setOrderItems(parsedOrder.items || []);
        
        // Parse the order date and set it as selected date
        if (parsedOrder.date) {
          // Parse DD/MM/YYYY format to Date object
          const [day, month, year] = parsedOrder.date.split('/');
          const orderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          setSelectedDate(orderDate);
        }
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

  const handleAddToOrder = (product: Product, unit: 'Pc' | 'Outer' | 'Case', quantity: number, productNotes?: string) => {
    setOrderItems(prevItems => {
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
        const newItem: OrderItem = {
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

  const handleUpdateQuantity = useCallback((productId: string, unit: 'Pc' | 'Outer' | 'Case', newQuantity: number) => {
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
  }, []);

  const handleUpdateNotes = useCallback((productId: string, unit: 'Pc' | 'Outer' | 'Case', productNotes: string) => {
    setOrderItems(prevItems => {
      return prevItems.map(item => {
        if (item.productId === productId && item.unit === unit) {
          return { ...item, productNotes: productNotes || '' };
        }
        return item;
      });
    });
  }, []);

  const handleRemoveItem = useCallback((productId: string, unit: 'Pc' | 'Outer' | 'Case') => {
    setOrderItems(prevItems => 
      prevItems.filter(item => !(item.productId === productId && item.unit === unit))
    );
  }, []);

  const navigateToOrdersList = useCallback(() => {
    markListDirty('orders');
    router.dismissTo('/(tabs)/orders');
  }, [router]);

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
      
      // Format the selected date to DD/MM/YYYY format
      const formattedDate = selectedDate.toLocaleDateString('en-GB');
      
      await api.orders.update(order._id, {
        items: orderItems,
        totalItems: totalItems,
        date: formattedDate,
        // Update the order with current items and new date
      });

      Alert.alert(
        'Order Updated!', 
        `Order ${order.orderNumber} has been updated successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              markListDirty('orders');
              router.back();
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
              
              // Format the selected date to DD/MM/YYYY format
              const formattedDate = selectedDate.toLocaleDateString('en-GB');
              
              await api.orders.update(order._id, {
                items: orderItems,
                totalItems: totalItems,
                status: 'Completed',
                date: formattedDate,
              });

              Alert.alert(
                'Order Completed!', 
                `Order ${order.orderNumber} has been marked as completed successfully.`,
                [
                  {
                    text: 'OK',
                    onPress: navigateToOrdersList,
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
              <Ionicons name="close" size={24} color={colors.inkMuted} />
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
              <Ionicons name="close" size={24} color={colors.inkMuted} />
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
                    <View
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
                          color={(productSelections[product._id]?.quantity || 0) > 0 ? colors.white : colors.brand} 
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={[
                          styles.quantityInput,
                          (productSelections[product._id]?.quantity || 0) > 0 && styles.quantityInputSelected
                        ]}
                        value={productSelections[product._id]?.quantity?.toString() || '0'}
                        onChangeText={(text) => {
                          const numericValue = parseInt(text) || 0;
                          handleQuantityChange(product._id, Math.max(0, numericValue));
                        }}
                        keyboardType="numeric"
                        selectTextOnFocus
                        maxLength={6}
                        placeholder="0"
                        placeholderTextColor={colors.brand}
                      />
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(product._id, (productSelections[product._id]?.quantity || 0) + 1)}
                      >
                        <Ionicons 
                          name="add" 
                          size={16} 
                          color={(productSelections[product._id]?.quantity || 0) > 0 ? colors.white : colors.brand} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Notes Input */}
                <View style={styles.orderItemNotesSection}>
                  <Text style={styles.notesLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes for this product..."
                    placeholderTextColor={colors.inkFaint}
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

  const BrandCard = ({ brand }: { brand: Brand }) => (
    <TouchableOpacity 
      style={styles.brandCard}
      onPress={() => handleBrandPress(brand)}
    >
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{brand.name}</Text>
        <Text style={styles.productCount}>{getBrandProductCount(brand._id)} Products</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
    </TouchableOpacity>
  );

  const CustomDatePicker = () => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const generateCalendarDays = () => {
      const today = new Date();
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const firstDayWeekday = firstDayOfMonth.getDay();
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayWeekday; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        days.push(day);
      }
      
      return days;
    };

    const handleDateSelect = (day: number) => {
      const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      setSelectedDate(newDate);
      setIsDatePickerVisible(false);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setSelectedDate(newDate);
    };

    const calendarDays = generateCalendarDays();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Modal
        visible={isDatePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <SafeAreaView style={styles.datePickerContainer}>
          {/* Header */}
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
              <Ionicons name="close" size={24} color={colors.inkMuted} />
            </TouchableOpacity>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => {
              setSelectedDate(new Date());
              setIsDatePickerVisible(false);
            }}>
              <Text style={styles.todayButton}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <Ionicons name="chevron-back" size={24} color={colors.brand} />
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <Ionicons name="chevron-forward" size={24} color={colors.brand} />
              </TouchableOpacity>
            </View>

            {/* Day Names */}
            <View style={styles.dayNamesRow}>
              {dayNames.map((day) => (
                <Text key={day} style={styles.dayName}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    day === selectedDate.getDate() && styles.selectedDay,
                    day === new Date().getDate() && 
                    selectedDate.getMonth() === new Date().getMonth() && 
                    selectedDate.getFullYear() === new Date().getFullYear() && 
                    styles.todayDay
                  ]}
                  onPress={() => day && handleDateSelect(day)}
                  disabled={!day}
                >
                  <Text style={[
                    styles.dayText,
                    day === selectedDate.getDate() && styles.selectedDayText,
                    day === new Date().getDate() && 
                    selectedDate.getMonth() === new Date().getMonth() && 
                    selectedDate.getFullYear() === new Date().getFullYear() && 
                    styles.todayDayText
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.brand} />
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
            <Ionicons name="storefront-outline" size={20} color={colors.brand} />
            <Text style={styles.infoLabel}>Retailer Name:</Text>
            <Text style={styles.infoValue}>{order.counterName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.brand} />
            <Text style={styles.infoLabel}>Phone No:</Text>
            <Text style={styles.infoValue}>+91 9876543210</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.brand} />
            <Text style={styles.infoLabel}>Bit:</Text>
            <Text style={styles.infoValue}>{order.bit}</Text>
          </View>
        </View>
      </View>

      {/* Date Picker Section */}
      <View style={styles.datePickerSection}>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setIsDatePickerVisible(true)}
        >
          <View style={styles.datePickerContent}>
            <Ionicons name="calendar-outline" size={20} color={colors.brand} />
            <Text style={styles.datePickerText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Order Items Section */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Items ({orderItems.length})</Text>
        </View>
        
        <View style={styles.orderItemsList}>
          {orderItems.map((item) => (
            <OrderItemCard
              key={`${item.productId}-${item.unit}`}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateNotes={handleUpdateNotes}
              onRemoveItem={handleRemoveItem}
            />
          ))}
        </View>


        {/* Brands List */}
        <View style={styles.brandsSection}>
          <Text style={styles.brandsTitle}>Available Brands</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand} />
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
            <Ionicons name="cube-outline" size={20} color={colors.brand} />
            <Text style={styles.summaryText}>
              Total Items: {getTotalItems()} Updated
            </Text>
          </View>
        </View>
      )}

      <ProductModal />
      <CustomDatePicker />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
    backgroundColor: colors.success,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  saveButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
  },
  saveButtonDisabled: {
    color: colors.lineStrong,
  },
  orderInfoSection: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
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
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
    color: colors.ink,
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
    fontFamily: fonts.display,
    color: colors.ink,
  },
  orderItemsList: {
    gap: 12,
    marginBottom: 20,
  },
  orderItemCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  orderItemInfo: {
    marginBottom: 12,
  },
  orderItemName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 100,
  },
  quantityButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    paddingHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  quantityTextInput: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
    paddingHorizontal: 8,
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  orderItemNotesSection: {
    marginTop: 0,
  },
  notesLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  notesDisplayContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.bg,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  notesDisplayText: {
    fontSize: 13,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
  },
  brandsSection: {
    marginBottom: 20,
  },
  brandsTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 15,
  },
  brandsList: {
    gap: 12,
  },
  brandCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  bottomSummary: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
    marginLeft: 8,
  },
  // Modal Styles (same as new-order.tsx)
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.brand,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.white,
  },
  addButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.brand,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  productItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  productName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unitButtonSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  unitText: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
  },
  unitTextSelected: {
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  quantitySection: {
    alignItems: 'center',
  },
  quantityControlsSelected: {
    backgroundColor: colors.brand,
  },
  quantityInput: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
    paddingHorizontal: 8,
    minWidth: 40,
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  quantityInputSelected: {
    color: colors.white,
  },
  quantityTextSelected: {
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  // Date Picker Styles
  datePickerSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerText: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    marginLeft: 12,
  },
  // Date Picker Modal Styles
  datePickerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.brand,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.white,
  },
  todayButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthYear: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: colors.brand,
  },
  todayDay: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  dayText: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  selectedDayText: {
    fontFamily: fonts.sansBold,
    color: colors.white,
  },
  todayDayText: {
    fontFamily: fonts.sansBold,
    color: colors.brand,
  },
});

type OrderItemCardProps = {
  item: OrderItem;
  onUpdateQuantity: (productId: string, unit: 'Pc' | 'Outer' | 'Case', quantity: number) => void;
  onUpdateNotes: (productId: string, unit: 'Pc' | 'Outer' | 'Case', productNotes: string) => void;
  onRemoveItem: (productId: string, unit: 'Pc' | 'Outer' | 'Case') => void;
};

const OrderItemCard = React.memo(function OrderItemCard({
  item,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
}: OrderItemCardProps) {
  return (
    <View style={styles.orderItemCard}>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>{item.productName}</Text>
        <Text style={styles.orderItemBrand}>{item.brandName} • {item.unit}</Text>
      </View>

      <View style={styles.orderItemControls}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.productId, item.unit, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color={colors.brand} />
          </TouchableOpacity>
          <TextInput
            style={styles.quantityTextInput}
            value={item.quantity.toString()}
            onChangeText={(text) => {
              const numericValue = parseInt(text) || 0;
              onUpdateQuantity(item.productId, item.unit, Math.max(0, numericValue));
            }}
            keyboardType="numeric"
            selectTextOnFocus
            maxLength={6}
          />
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.productId, item.unit, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color={colors.brand} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemoveItem(item.productId, item.unit)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.orderItemNotesSection}>
        <Text style={styles.notesLabel}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes for this product..."
          placeholderTextColor={colors.inkFaint}
          value={item.productNotes || ''}
          onChangeText={(text) => onUpdateNotes(item.productId, item.unit, text)}
          multiline
          numberOfLines={2}
          maxLength={500}
        />
      </View>
    </View>
  );
});
