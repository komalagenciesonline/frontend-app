import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Product } from '../../../utils/api';
import { consumeListDirty } from '../../../utils/listRefresh';
import { colors, fonts, radii, shadow } from '../../../constants/theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');
const PAGE_SIZE = 10;
const STALE_TIME_MS = 30000;

// Memoized ProductCard component to prevent unnecessary re-renders
const ProductCard = React.memo(({ 
  product, 
  onEdit,
  onDelete 
}: { 
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) => (
  <View style={styles.productCard}>
    <View style={styles.productContent}>
      <View style={styles.brandBadge}>
        <Ionicons name="business-outline" size={16} color={colors.brand} />
        <Text style={styles.brandText}>{product.brandName}</Text>
      </View>
      
      <Text style={styles.productName}>{product.name}</Text>
    </View>
    
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => onEdit(product)}
      >
        <Ionicons name="create-outline" size={20} color={colors.brand} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => onDelete(product)}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
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
          placeholder="Search products..."
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

export default function ItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [brandOptions, setBrandOptions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  // Temporary filter state for modal (not applied until Apply is clicked)
  const [tempSelectedBrand, setTempSelectedBrand] = useState('all');
  
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

  const loadBrandOptions = useCallback(async () => {
    try {
      const brandNames = await api.products.getUniqueBrandNames();
      setBrandOptions([
        { label: 'All Brands', value: 'all' },
        ...brandNames.map((name) => ({ label: name, value: name })),
      ]);
    } catch (error) {
      console.error('Error loading brand options:', error);
    }
  }, []);

  useEffect(() => {
    loadBrandOptions();
  }, [loadBrandOptions]);

  const fetchProducts = useCallback(async (reset: boolean, suppressLoading = false) => {
    if (isFetchingRef.current) return;
    if (!reset && (!hasMore || isLoadingMore)) return;

    isFetchingRef.current = true;

    try {
      if (reset && !suppressLoading) {
        setIsLoading(true);
      } else if (!reset) {
        setIsLoadingMore(true);
      }

      const response = await api.products.getPage({
        brand: selectedBrand === 'all' ? undefined : selectedBrand,
        search: debouncedSearchQuery.trim() || undefined,
        limit: PAGE_SIZE,
        skip: reset ? 0 : products.length,
      });

      setProducts((prev) => (reset ? response.data : [...prev, ...response.data]));
      setTotal(response.total);
      setHasMore(response.hasMore);
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [selectedBrand, debouncedSearchQuery, hasMore, isLoadingMore, products.length]);

  useEffect(() => {
    fetchProducts(true);
  }, [selectedBrand, debouncedSearchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (consumeListDirty('items')) {
        fetchProducts(true);
        return;
      }

      const now = Date.now();
      const lastFetch = lastFetchTimeRef.current;

      if (lastFetch !== null && (now - lastFetch) < STALE_TIME_MS) {
        return;
      }

      fetchProducts(true);
    }, [fetchProducts])
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchProducts(false);
    }
  }, [fetchProducts, isLoading, isLoadingMore, hasMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(true, true);
    setRefreshing(false);
  }, [fetchProducts]);

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    router.push({
      pathname: '/(tabs)/items/edit-item',
      params: {
        productData: JSON.stringify(product)
      }
    });
  }, [router]);

  const handleDeleteProduct = useCallback(async (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.${
        product.brandName ? `\n\nNote: If this is the last product for brand "${product.brandName}", the brand will be automatically deleted.` : ''
      }`,
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
              await api.products.delete(product._id);
              await fetchProducts(true);
              Alert.alert(
                'Success', 
                'Product deleted successfully. If this was the last product for its brand, the brand has been automatically removed.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  }, [fetchProducts]);

  // Handle brand cleanup
  const handleBrandCleanup = useCallback(async () => {
    Alert.alert(
      'Cleanup Empty Brands',
      'This will automatically delete any brands that have no products. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Cleanup',
          onPress: async () => {
            try {
              setIsCleaningUp(true);
              await api.brands.cleanup();
              await Promise.all([loadBrandOptions(), fetchProducts(true)]);
              Alert.alert('Success', 'Brand cleanup completed successfully');
            } catch (error) {
              console.error('Error during brand cleanup:', error);
              Alert.alert('Error', 'Failed to cleanup brands. Please try again.');
            } finally {
              setIsCleaningUp(false);
            }
          },
        },
      ]
    );
  }, [fetchProducts]);

  // Handle opening filter modal - copy current filter to temp state
  const handleOpenFilterModal = useCallback(() => {
    setTempSelectedBrand(selectedBrand);
    setModalVisible(true);
  }, [selectedBrand]);

  // Handle applying filters
  const handleApplyFilters = useCallback(() => {
    setSelectedBrand(tempSelectedBrand);
    setModalVisible(false);
  }, [tempSelectedBrand]);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setTempSelectedBrand('all');
  }, []);

  const handleNavigateToBrands = useCallback(() => {
    router.push('/(tabs)/items/brands');
  }, [router]);

  const handleAddProduct = useCallback(() => {
    router.push('/(tabs)/items/new-item');
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
        style={styles.productsContainer}
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
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>
            Products ({total})
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.cleanupButton, isCleaningUp && styles.cleanupButtonDisabled]}
              onPress={handleBrandCleanup}
              disabled={isCleaningUp}
            >
              <Ionicons name="trash-outline" size={20} color={isCleaningUp ? colors.inkFaint : colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.analyticsButton}
              onPress={() => router.push('/(tabs)/items/item-analytics')}
            >
              <Ionicons name="analytics-outline" size={20} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.brandsButton}
              onPress={handleNavigateToBrands}
            >
              <Ionicons name="business-outline" size={20} color={colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddProduct}
            >
              <Ionicons name="add" size={24} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.productsList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard 
                key={product._id} 
                product={product}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={colors.inkFaint} />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No Matching Products' : 'No Products Found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() 
                  ? `No products found for "${searchQuery}"`
                  : selectedBrand !== 'all'
                    ? 'Try adjusting your brand selection'
                    : 'Add some products to get started'
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
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Brands</Text>
              <View style={styles.filterOptions}>
                {brandOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempSelectedBrand === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setTempSelectedBrand(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempSelectedBrand === option.value && styles.filterOptionTextSelected
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
  productsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  productsTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cleanupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanupButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  analyticsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
  },
  productsList: {
    gap: 12,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productContent: {
    flex: 1,
    gap: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  brandText: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
  },
  productName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
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