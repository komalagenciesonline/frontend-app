import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Order } from '../../../utils/api';
import { consumeListDirty } from '../../../utils/listRefresh';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');
const PAGE_SIZE = 10;
const STALE_TIME_MS = 30000;

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
    activeOpacity={0.75}
    onPress={() => onPress(order)}
  >
    {/* First Row: Order Number and Status */}
    <View style={styles.orderHeader}>
      <Text style={styles.orderNumber}>{order.orderNumber}</Text>
      <View
        style={[
          styles.statusBadge,
          order.status === 'Completed' ? styles.statusCompleted : styles.statusPending,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            order.status === 'Completed' ? styles.statusTextCompleted : styles.statusTextPending,
          ]}
        >
          {order.status}
        </Text>
      </View>
    </View>
    
    {/* Second Row: Retailer Name (full width) */}
    <View style={styles.retailerRow}>
      <Text style={styles.counterName}>{order.counterName}</Text>
    </View>
    
    {/* Third Row: Bit Name and Action Buttons */}
    <View style={styles.bitAndActionsRow}>
      <View style={styles.bitBadge}>
        <Ionicons name="location-outline" size={14} color="#007AFF" />
        <Text style={styles.bitText}>{order.bit}</Text>
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
    
    {/* Fourth Row: Date */}
    <View style={styles.itemsAndDateRow}>
      <View style={styles.metaChip}>
        <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
        <Text style={styles.metaChipText}>{order.date}</Text>
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
        <Ionicons name="search-outline" size={18} color="#8E8E93" />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search orders by counter name..."
          placeholderTextColor="#AEAEB2"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
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
          <Ionicons name="options-outline" size={18} color="#007AFF" />
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
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const debounceTimeoutRef = useRef<number | null>(null);
  const lastFetchTimeRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);

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

  const fetchOrders = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    if (!reset && (!hasMore || isLoadingMore)) return;

    isFetchingRef.current = true;

    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await api.orders.getPage({
        bit: bitsFilter === 'all' ? undefined : bitsFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        date: dateFilter === 'all' ? undefined : dateFilter,
        search: debouncedSearchQuery.trim() || undefined,
        limit: PAGE_SIZE,
        skip: reset ? 0 : orders.length,
      });

      setOrders((prev) => (reset ? response.data : [...prev, ...response.data]));
      setTotal(response.total);
      setHasMore(response.hasMore);
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [bitsFilter, statusFilter, dateFilter, debouncedSearchQuery, hasMore, isLoadingMore, orders.length]);

  useEffect(() => {
    fetchOrders(true);
  }, [bitsFilter, statusFilter, dateFilter, debouncedSearchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (consumeListDirty('orders')) {
        fetchOrders(true);
        return;
      }

      const now = Date.now();
      const lastFetch = lastFetchTimeRef.current;

      if (lastFetch !== null && (now - lastFetch) < STALE_TIME_MS) {
        return;
      }

      fetchOrders(true);
    }, [fetchOrders])
  );

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleOrderPress = useCallback((order: Order) => {
    router.push({
      pathname: '/(tabs)/orders/order-details',
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
      pathname: '/(tabs)/orders/edit-order',
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
              await fetchOrders(true);
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Error', 'Failed to delete order. Please try again.');
            }
          },
        },
      ]
    );
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(true);
    setRefreshing(false);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchOrders(false);
    }
  }, [fetchOrders, isLoading, isLoadingMore, hasMore]);

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
  }, [tempStatusFilter, tempDateFilter, tempBitsFilter]);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setTempStatusFilter('all');
    setTempDateFilter('all');
    setTempBitsFilter('all');
  }, []);

  const handleCleanupOldOrders = useCallback(async () => {
    try {
      const { count } = await api.orders.getCleanupPreview();

      if (count === 0) {
        Alert.alert('No Old Orders', 'There are no completed orders older than 31 days to clean up.');
        return;
      }

      Alert.alert(
        'Delete Old Orders',
        `Found ${count} completed order(s) older than 31 days. Do you want to delete them?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await api.orders.cleanupOldCompleted();
                await fetchOrders(true);
                Alert.alert('Success', `${result.deletedCount} order(s) have been deleted successfully.`);
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
  }, [fetchOrders]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
      
      {/* Search Bar */}
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFilterPress={handleOpenFilterModal}
      />

      <FlatList
        style={styles.ordersContainer}
        contentContainerStyle={styles.ordersListContent}
        data={orders}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.ordersHeader}>
            <View style={styles.ordersTitleRow}>
              <Text style={styles.ordersTitle}>Orders</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{total}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cleanupButton}
              onPress={handleCleanupOldOrders}
            >
              <Ionicons name="brush-outline" size={20} color="#FF9500" />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={handleOrderPress}
            onEdit={handleEditPress}
            onDelete={handleDeletePress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.orderSeparator} />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={32} color="#007AFF" />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No Matching Orders' : 'No Orders Found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim()
                  ? `No orders found for "${searchQuery}"`
                  : bitsFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Orders will appear here when created'}
              </Text>
            </View>
          )
        }
      />

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
              <Ionicons name="close" size={20} color="#636366" />
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F2F4F7',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 10,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ordersListContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  orderSeparator: {
    height: 10,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  ordersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ordersTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  countBadge: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cleanupButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  retailerRow: {
    marginBottom: 10,
  },
  bitAndActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemsAndDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.3,
  },
  counterName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#E8F9EE',
  },
  statusPending: {
    backgroundColor: '#FFF4E5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#248A3D',
  },
  statusTextPending: {
    color: '#C93400',
  },
  bitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    maxWidth: '65%',
  },
  bitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    flexShrink: 1,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  metaChipText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '500',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: 'rgba(10, 22, 40, 0.55)',
    zIndex: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    zIndex: 1,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A1628',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    backgroundColor: '#F2F4F7',
  },
  filterOptionSelected: {
    backgroundColor: '#0A1628',
    borderColor: '#0A1628',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#636366',
    fontWeight: '600',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    backgroundColor: '#FFFFFF',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636366',
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});