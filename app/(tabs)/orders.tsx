import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Order } from '../../utils/api';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [bitsFilter, setBitsFilter] = useState('all');
  
  // Temporary filter states for modal (not applied until Apply is clicked)
  const [tempStatusFilter, setTempStatusFilter] = useState('all');
  const [tempDateFilter, setTempDateFilter] = useState('all');
  const [tempBitsFilter, setTempBitsFilter] = useState('all');
  
  // Modal visibility state
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        const ordersData = await api.orders.getAll(
          bitsFilter === 'all' ? undefined : bitsFilter,
          statusFilter === 'all' ? undefined : statusFilter,
          searchQuery || undefined
        );
        setOrders(ordersData);
      } catch (error) {
        console.error('Error loading orders:', error);
        Alert.alert('Error', 'Failed to load orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [bitsFilter, statusFilter, searchQuery]);

  // Reload orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadOrders = async () => {
        try {
          const ordersData = await api.orders.getAll(
            bitsFilter === 'all' ? undefined : bitsFilter,
            statusFilter === 'all' ? undefined : statusFilter,
            searchQuery || undefined
          );
          setOrders(ordersData);
        } catch (error) {
          console.error('Error loading orders:', error);
        }
      };

      loadOrders();
    }, [bitsFilter, statusFilter, searchQuery])
  );

  // Handle delete button press
  const handleDeletePress = (order: Order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order ${order.orderNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.orders.delete(order._id);
              // Update local state
              setOrders(orders.filter(o => o._id !== order._id));
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Error', 'Failed to delete order. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle edit button press
  const handleEditPress = (order: Order) => {
    router.push({
      pathname: '/orders/edit-order',
      params: {
        orderData: JSON.stringify(order)
      }
    });
  };

  // Handle opening filter modal - copy current filters to temp state
  const handleOpenFilterModal = () => {
    setTempStatusFilter(statusFilter);
    setTempDateFilter(dateFilter);
    setTempBitsFilter(bitsFilter);
    setModalVisible(true);
  };

  // Handle applying filters
  const handleApplyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setDateFilter(tempDateFilter);
    setBitsFilter(tempBitsFilter);
    setModalVisible(false);
  };

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    setTempStatusFilter('all');
    setTempDateFilter('all');
    setTempBitsFilter('all');
  };

  // Since we're now filtering on the server side, we can use orders directly
  const filteredOrders = orders;

  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={handleOpenFilterModal}
        >
          <Ionicons name="filter-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Filter options data
  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
  ];

  const dateOptions = [
    { label: 'All Dates', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  const bitsOptions = [
    { label: 'All Bits', value: 'all' },
    { label: 'Turori', value: 'Turori' },
    { label: 'Naldurg & Jalkot', value: 'Naldurg & Jalkot' },
    { label: 'Gunjoti & Murum', value: 'Gunjoti & Murum' },
    { label: 'Dalimb & Yenegur', value: 'Dalimb & Yenegur' },
    { label: 'Sastur & Makhani', value: 'Sastur & Makhani' },
    { label: 'Narangwadi & Killari', value: 'Narangwadi & Killari' },
    { label: 'Andur', value: 'Andur' },
    { label: 'Omerga', value: 'Omerga' },
  ];

  const OrderCard = ({ order }: { order: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push({
        pathname: '/orders/order-details',
        params: {
          orderData: JSON.stringify(order)
        }
      })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.counterName}>{order.counterName}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: order.status === 'Completed' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{order.bit}</Text>
          </View>
          <View style={styles.orderHeaderRight}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditPress(order)}
            >
              <Ionicons name="create-outline" size={18} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeletePress(order)}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{order.totalItems} items</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{order.date}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Search Bar */}
      <SearchBar />

      {/* Orders List */}
      <ScrollView style={styles.ordersContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>
            Orders ({filteredOrders.length})
          </Text>
        </View>
        
        <View style={styles.ordersList}>
          {filteredOrders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </View>
        
        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or bit selection</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        isVisible={isModalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modal}
        hasBackdrop={false}
        coverScreen={true}
        deviceHeight={screenHeight}
        deviceWidth={screenWidth}
        statusBarTranslucent={true}
        useNativeDriverForBackdrop={true}
        hideModalContentWhileAnimating={false}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.customBackdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Bits</Text>
              <View style={styles.filterOptions}>
                {bitsOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempBitsFilter === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setTempBitsFilter(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempBitsFilter === option.value && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempStatusFilter === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setTempStatusFilter(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempStatusFilter === option.value && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.filterOptions}>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempDateFilter === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setTempDateFilter(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempDateFilter === option.value && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  filterButton: {
    padding: 5,
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ordersHeader: {
    paddingVertical: 15,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  ordersList: {
    gap: 12,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  counterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
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
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  customBackdrop: {
    position: 'absolute',
    top: StatusBar.currentHeight ? -StatusBar.currentHeight : 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    zIndex: 1,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff',
  },
  filterOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff',
    marginRight: 10,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});