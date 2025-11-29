import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Order } from '../../utils/api';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');

// Memoized OrderCard component to prevent unnecessary re-renders
const OrderCard = React.memo(({ 
  order, 
  onEdit, 
  onDelete, 
  onPress 
}: { 
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onPress: (order: Order) => void;
}) => (
  <TouchableOpacity 
    style={styles.orderCard}
    onPress={() => onPress(order)}
  >
    {/* First Row: Order Number and Status */}
    <View style={styles.orderHeader}>
      <Text style={styles.orderNumber}>{order.orderNumber}</Text>
      <View style={[
        styles.statusBadge,
        { backgroundColor: order.status === 'Completed' ? '#4CAF50' : '#FF9800' }
      ]}>
        <Text style={styles.statusText}>{order.status}</Text>
      </View>
    </View>
    
    {/* Second Row: Retailer Name (full width) */}
    <View style={styles.retailerRow}>
      <Text style={styles.counterName}>{order.counterName}</Text>
    </View>
    
    {/* Third Row: Bit Name and Action Buttons */}
    <View style={styles.bitAndActionsRow}>
      <View style={styles.detailItem}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.detailText}>{order.bit}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => onEdit(order)}
        >
          <Ionicons name="create-outline" size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete(order)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
    
    {/* Fourth Row: Total Items and Date */}
    <View style={styles.itemsAndDateRow}>
      <View style={styles.detailItem}>
        <Ionicons name="cube-outline" size={16} color="#666" />
        <Text style={styles.detailText}>{order.totalItems} items</Text>
      </View>
      <View style={styles.detailItem}>
        <Ionicons name="calendar-outline" size={16} color="#666" />
        <Text style={styles.detailText}>{order.date}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

// Memoized SearchBar component to prevent unnecessary re-renders
const SearchBar = React.memo(({ 
  searchQuery, 
  onSearchChange, 
  onFilterPress 
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
}) => {
  const searchInputRef = useRef<TextInput>(null);
  
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search orders by counter name..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          // Critical props to prevent keyboard dismissal
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="default"
          textContentType="none"
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <Ionicons name="filter-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bitsFilter: incomingBitsFilter, statusFilter: incomingStatusFilter, dateFilter: incomingDateFilter } = useLocalSearchParams<{
    bitsFilter?: string;
    statusFilter?: string;
    dateFilter?: string;
  }>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Filter states - initialize with incoming params if available
  const [statusFilter, setStatusFilter] = useState(incomingStatusFilter || 'all');
  const [dateFilter, setDateFilter] = useState(incomingDateFilter || 'all');
  const [bitsFilter, setBitsFilter] = useState(incomingBitsFilter || 'all');
  
  // Temporary filter states for modal (not applied until Apply is clicked)
  const [tempStatusFilter, setTempStatusFilter] = useState('all');
  const [tempDateFilter, setTempDateFilter] = useState('all');
  const [tempBitsFilter, setTempBitsFilter] = useState('all');
  
  // Modal visibility state
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for cleanup
  const debounceTimeoutRef = useRef<number | null>(null);

  // Debounce search query to reduce re-renders
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Memoize date filter functions to prevent recalculation
  const dateFilterFunctions = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return {
      today: (orderDate: Date) => orderDate >= startOfToday,
      week: (orderDate: Date) => orderDate >= startOfWeek,
      month: (orderDate: Date) => orderDate >= startOfMonth,
    };
  }, []); // Empty dependency - calculate once

  // Memoize filter options to prevent re-creation
  const filterOptions = useMemo(() => ({
    status: [
      { label: 'All Status', value: 'all' },
      { label: 'Pending', value: 'Pending' },
      { label: 'Completed', value: 'Completed' },
    ],
    date: [
      { label: 'All Dates', value: 'all' },
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' },
      { label: 'This Month', value: 'month' },
    ],
    bits: [
      { label: 'All Bits', value: 'all' },
      { label: 'Turori', value: 'Turori' },
      { label: 'Naldurg & Jalkot', value: 'Naldurg & Jalkot' },
      { label: 'Gunjoti & Murum', value: 'Gunjoti & Murum' },
      { label: 'Dalimb & Yenegur', value: 'Dalimb & Yenegur' },
      { label: 'Sastur & Makhani', value: 'Sastur & Makhani' },
      { label: 'Narangwadi & Killari', value: 'Narangwadi & Killari' },
      { label: 'Andur', value: 'Andur' },
      { label: 'Omerga', value: 'Omerga' },
    ]
  }), []);

  // Simple load orders function (without search - search is handled client-side)
  const loadOrders = useCallback(async (customBitsFilter?: string, customStatusFilter?: string) => {
    try {
      setIsLoading(true);
      
      const ordersData = await api.orders.getAll(
        (customBitsFilter || bitsFilter) === 'all' ? undefined : (customBitsFilter || bitsFilter),
        (customStatusFilter || statusFilter) === 'all' ? undefined : (customStatusFilter || statusFilter)
      );
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [bitsFilter, statusFilter]);

  // Load orders ONLY on initial mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Use useMemo for filtering with debounced search query
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by bits
    if (bitsFilter !== 'all') {
      filtered = filtered.filter(order => order.bit === bitsFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.date.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
        
        switch (dateFilter) {
          case 'today':
            return dateFilterFunctions.today(orderDate);
          case 'week':
            return dateFilterFunctions.week(orderDate);
          case 'month':
            return dateFilterFunctions.month(orderDate);
          default:
            return true;
        }
      });
    }

    // Filter by search query using debounced value
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(order =>
        order.counterName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [orders, bitsFilter, statusFilter, dateFilter, debouncedSearchQuery, dateFilterFunctions]);

  // Handle incoming filter parameters and refresh data when they change
  useEffect(() => {
    if (incomingBitsFilter || incomingStatusFilter || incomingDateFilter) {
      // Update states with incoming parameters
      setBitsFilter(incomingBitsFilter || 'all');
      setStatusFilter(incomingStatusFilter || 'all');
      setDateFilter(incomingDateFilter || 'all');
      
      // Refresh data with new filters
      loadOrders(incomingBitsFilter || 'all', incomingStatusFilter || 'all');
    }
  }, [incomingBitsFilter, incomingStatusFilter, incomingDateFilter]);

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleOrderPress = useCallback((order: Order) => {
    router.push({
      pathname: '/orders/order-details',
      params: {
        orderData: JSON.stringify(order),
        bitsFilter: bitsFilter,
        statusFilter: statusFilter,
        dateFilter: dateFilter
      }
    });
  }, [router, bitsFilter, statusFilter, dateFilter]);

  const handleEditPress = useCallback((order: Order) => {
    router.push({
      pathname: '/orders/edit-order',
      params: {
        orderData: JSON.stringify(order),
        bitsFilter: bitsFilter,
        statusFilter: statusFilter,
        dateFilter: dateFilter
      }
    });
  }, [router, bitsFilter, statusFilter, dateFilter]);

  const handleDeletePress = useCallback((order: Order) => {
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
              // Refresh the orders list after deletion
              await loadOrders();
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Error', 'Failed to delete order. Please try again.');
            }
          },
        },
      ]
    );
  }, [loadOrders]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  // Handle opening filter modal - copy current filters to temp state
  const handleOpenFilterModal = useCallback(() => {
    setTempStatusFilter(statusFilter);
    setTempDateFilter(dateFilter);
    setTempBitsFilter(bitsFilter);
    setModalVisible(true);
  }, [statusFilter, dateFilter, bitsFilter]);

  // Handle applying filters
  const handleApplyFilters = useCallback(() => {
    setStatusFilter(tempStatusFilter);
    setDateFilter(tempDateFilter);
    setBitsFilter(tempBitsFilter);
    setModalVisible(false);
    // Refresh data when filters are applied with the new filter values
    loadOrders(tempBitsFilter, tempStatusFilter);
  }, [tempStatusFilter, tempDateFilter, tempBitsFilter, loadOrders]);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setTempStatusFilter('all');
    setTempDateFilter('all');
    setTempBitsFilter('all');
  }, []);

  // Function to get orders that are completed and 31+ days old
  const getOldCompletedOrders = (allOrders: Order[]): Order[] => {
    const today = new Date();
    const thirtyOneDaysAgo = new Date(today);
    thirtyOneDaysAgo.setDate(today.getDate() - 31);
    
    return allOrders.filter(order => {
      if (order.status !== 'Completed') return false;
      
      // Parse the date (format: DD/MM/YYYY)
      const [day, month, year] = order.date.split('/');
      const orderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return orderDate <= thirtyOneDaysAgo;
    });
  };

  // Handle cleanup of old orders
  const handleCleanupOldOrders = useCallback(async () => {
    try {
      // Get all orders from the server (not just filtered ones)
      const allOrders = await api.orders.getAll();
      const oldOrders = getOldCompletedOrders(allOrders);
      
      if (oldOrders.length === 0) {
        Alert.alert('No Old Orders', 'There are no completed orders older than 31 days to clean up.');
        return;
      }

      // Show confirmation before deleting
      Alert.alert(
        'Delete Old Orders',
        `Found ${oldOrders.length} completed order(s) older than 31 days. Do you want to delete them?`,
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
                // Delete old orders from database
                const orderIds = oldOrders.map(order => order._id);
                await api.orders.deleteOldCompleted(orderIds);
                
                // Refresh the orders list
                await loadOrders();
                
                Alert.alert('Success', `${oldOrders.length} order(s) have been deleted successfully.`);
              } catch (error) {
                console.error('Error deleting orders:', error);
                Alert.alert('Error', 'Failed to delete orders. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error cleaning up orders:', error);
      Alert.alert('Error', 'Failed to process cleanup. Please try again.');
    }
  }, [loadOrders]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Search Bar */}
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFilterPress={handleOpenFilterModal}
      />

      {/* Orders List */}
      <ScrollView 
        style={styles.ordersContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>
            Orders ({filteredOrders.length})
          </Text>
          <TouchableOpacity 
            style={styles.cleanupButton}
            onPress={handleCleanupOldOrders}
          >
            <Ionicons name="brush-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.ordersList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard 
                key={order._id} 
                order={order} 
                onPress={handleOrderPress}
                onEdit={handleEditPress}
                onDelete={handleDeletePress}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No Matching Orders' : 'No Orders Found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() 
                  ? `No orders found for "${searchQuery}"`
                  : bitsFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Orders will appear here when created'
                }
              </Text>
            </View>
          )}
        </View>
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
                {filterOptions.bits.map((option) => (
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
                {filterOptions.status.map((option) => (
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
                {filterOptions.date.map((option) => (
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  cleanupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 8,
  },
  retailerRow: {
    marginBottom: 8,
  },
  bitAndActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsAndDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
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