import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Retailer } from '../../../utils/api';
import { consumeListDirty } from '../../../utils/listRefresh';
import { colors, fonts, radii, shadow } from '../../../constants/theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');
const PAGE_SIZE = 10;
const STALE_TIME_MS = 30000;

// Memoized RetailerCard component to prevent unnecessary re-renders
const RetailerCard = React.memo(({ 
  retailer, 
  onPress,
  onEdit,
  onDelete 
}: { 
  retailer: Retailer;
  onPress: (retailer: Retailer) => void;
  onEdit: (retailer: Retailer) => void;
  onDelete: (retailer: Retailer) => void;
}) => (
  <View style={styles.retailerCard}>
    <TouchableOpacity 
      style={styles.retailerContent}
      onPress={() => onPress(retailer)}
    >
      {/* Retailer Name - Full Width */}
      <View style={styles.retailerNameRow}>
        <Text style={styles.retailerName}>{retailer.name}</Text>
      </View>
      
      {/* Bit and Action Buttons Row */}
      <View style={styles.phoneBitActionsRow}>
        <View style={styles.bitBadge}>
          <Ionicons name="location-outline" size={16} color={colors.brand} />
          <Text style={styles.bitText}>{retailer.bit}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => onEdit(retailer)}
          >
            <Ionicons name="create-outline" size={20} color={colors.brand} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => onDelete(retailer)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </View>
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
        <Ionicons name="search-outline" size={18} color={colors.inkMuted} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search retailers..."
          placeholderTextColor={colors.inkFaint}
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
          <Ionicons name="options-outline" size={18} color={colors.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function RetailersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [bitsFilter, setBitsFilter] = useState('all');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Temporary filter state for modal (not applied until Apply is clicked)
  const [tempBitsFilter, setTempBitsFilter] = useState('all');
  
  // Modal visibility state
  const [isModalVisible, setModalVisible] = useState(false);

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

  const bitsOptions = useMemo(() => [
    { label: 'All Bits', value: 'all' },
    { label: 'Turori', value: 'Turori' },
    { label: 'Naldurg & Jalkot', value: 'Naldurg & Jalkot' },
    { label: 'Gunjoti & Murum', value: 'Gunjoti & Murum' },
    { label: 'Dalimb & Yenegur', value: 'Dalimb & Yenegur' },
    { label: 'Sastur & Makhani', value: 'Sastur & Makhani' },
    { label: 'Narangwadi & Killari', value: 'Narangwadi & Killari' },
    { label: 'Andur', value: 'Andur' },
    { label: 'Omerga', value: 'Omerga' },
  ], []);

  const fetchRetailers = useCallback(async (reset: boolean, suppressLoading = false) => {
    if (isFetchingRef.current) return;
    if (!reset && (!hasMore || isLoadingMore)) return;

    isFetchingRef.current = true;

    try {
      if (reset && !suppressLoading) {
        setIsLoading(true);
      } else if (!reset) {
        setIsLoadingMore(true);
      }

      const response = await api.retailers.getPage({
        bit: bitsFilter === 'all' ? undefined : bitsFilter,
        search: debouncedSearchQuery.trim() || undefined,
        limit: PAGE_SIZE,
        skip: reset ? 0 : retailers.length,
      });

      setRetailers((prev) => (reset ? response.data : [...prev, ...response.data]));
      setTotal(response.total);
      setHasMore(response.hasMore);
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error loading retailers:', error);
      Alert.alert('Error', 'Failed to load retailers. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [bitsFilter, debouncedSearchQuery, hasMore, isLoadingMore, retailers.length]);

  useEffect(() => {
    fetchRetailers(true);
  }, [bitsFilter, debouncedSearchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (consumeListDirty('retailers')) {
        fetchRetailers(true);
        return;
      }

      const now = Date.now();
      const lastFetch = lastFetchTimeRef.current;

      if (lastFetch !== null && (now - lastFetch) < STALE_TIME_MS) {
        return;
      }

      fetchRetailers(true);
    }, [fetchRetailers])
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchRetailers(false);
    }
  }, [fetchRetailers, isLoading, isLoadingMore, hasMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRetailers(true, true);
    setRefreshing(false);
  }, [fetchRetailers]);

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleRetailerPress = useCallback((retailer: Retailer) => {
    router.push({
      pathname: '/(tabs)/orders/new-order',
      params: { 
        retailerName: retailer.name,
        retailerPhone: retailer.phone,
        retailerBit: retailer.bit
      }
    });
  }, [router]);

  const handleEditRetailer = useCallback((retailer: Retailer) => {
    router.push({
      pathname: '/(tabs)/retailers/edit-retailer',
      params: {
        retailerData: JSON.stringify(retailer)
      }
    });
  }, [router]);

  const handleDeleteRetailer = useCallback(async (retailer: Retailer) => {
    Alert.alert(
      'Delete Retailer',
      `Are you sure you want to delete ${retailer.name}?`,
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
              await api.retailers.delete(retailer._id);
              await fetchRetailers(true);
              Alert.alert('Success', 'Retailer deleted successfully');
            } catch (error) {
              console.error('Error deleting retailer:', error);
              Alert.alert('Error', 'Failed to delete retailer. Please try again.');
            }
          },
        },
      ]
    );
  }, [fetchRetailers]);

  // Handle opening filter modal - copy current filter to temp state
  const handleOpenFilterModal = useCallback(() => {
    setTempBitsFilter(bitsFilter);
    setModalVisible(true);
  }, [bitsFilter]);

  // Handle applying filters
  const handleApplyFilters = useCallback(() => {
    setBitsFilter(tempBitsFilter);
    setModalVisible(false);
  }, [tempBitsFilter]);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setTempBitsFilter('all');
  }, []);

  const handleAddRetailer = useCallback(() => {
    router.push('/(tabs)/retailers/new-retailer');
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      
      {/* Search Bar */}
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFilterPress={handleOpenFilterModal}
      />

      <ScrollView
        style={styles.retailersContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 48) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.retailersHeader}>
          <Text style={styles.retailersTitle}>
            Retailers ({total})
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddRetailer}
          >
            <Ionicons name="add" size={24} color={colors.brand} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.retailersList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.loadingText}>Loading retailers...</Text>
            </View>
          ) : retailers.length > 0 ? (
            retailers.map((retailer) => (
              <RetailerCard 
                key={retailer._id} 
                retailer={retailer}
                onPress={handleRetailerPress}
                onEdit={handleEditRetailer}
                onDelete={handleDeleteRetailer}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={64} color={colors.inkFaint} />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No Matching Retailers' : 'No Retailers Found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() 
                  ? `No retailers found for "${searchQuery}"`
                  : bitsFilter !== 'all'
                    ? 'Try adjusting your bit selection'
                    : 'Add some retailers to get started'
                }
              </Text>
            </View>
          )}
          {isLoadingMore && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.brand} />
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
            <Text style={styles.modalTitle}>Filter Retailers</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.inkMuted} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    ...shadow.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.ink,
    marginLeft: 10,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retailersContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  retailersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  retailersTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
  },
  retailersList: {
    gap: 12,
    paddingBottom: 20,
  },
  retailerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retailerContent: {
    flex: 1,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retailerNameRow: {
    marginBottom: 8,
  },
  phoneBitActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retailerName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  bitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  bitText: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.inkFaint,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
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
    backgroundColor: colors.overlay,
    zIndex: 0,
  },
  modalContent: {
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.bg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
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
    fontFamily: fonts.sansBold,
    color: colors.inkMuted,
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
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  filterOptionSelected: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.inkMuted,
    fontFamily: fonts.sansSemi,
  },
  filterOptionTextSelected: {
    color: colors.white,
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
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  clearButtonText: {
    fontSize: 15,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  applyButtonText: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
    color: colors.white,
    textAlign: 'center',
  },
});