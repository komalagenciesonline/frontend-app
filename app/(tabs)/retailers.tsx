import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Retailer } from '../../utils/api';

const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');

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
      <View style={styles.retailerHeader}>
        <View style={styles.retailerInfo}>
          <Text style={styles.retailerName}>{retailer.name}</Text>
          <Text style={styles.retailerPhone}>{retailer.phone}</Text>
        </View>
        <View style={styles.bitBadge}>
          <Ionicons name="location-outline" size={16} color="#007AFF" />
          <Text style={styles.bitText}>{retailer.bit}</Text>
        </View>
      </View>
    </TouchableOpacity>
    
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => onEdit(retailer)}
      >
        <Ionicons name="create-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => onDelete(retailer)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
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
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search retailers..."
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

export default function RetailersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [bitsFilter, setBitsFilter] = useState('all');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Temporary filter state for modal (not applied until Apply is clicked)
  const [tempBitsFilter, setTempBitsFilter] = useState('all');
  
  // Modal visibility state
  const [isModalVisible, setModalVisible] = useState(false);

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

  // Memoize bits options to prevent re-creation
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

  // Load retailers data with client-side filtering
  const loadRetailers = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load all retailers and filter client-side for better search performance
      const retailersData = await api.retailers.getAll(
        bitsFilter === 'all' ? undefined : bitsFilter
      );
      setRetailers(retailersData);
    } catch (error) {
      console.error('Error loading retailers:', error);
      Alert.alert('Error', 'Failed to load retailers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [bitsFilter]);

  // Client-side filtering with debounced search
  const filteredRetailers = useMemo(() => {
    let filtered = retailers;

    // Filter by bits
    if (bitsFilter !== 'all') {
      filtered = filtered.filter(retailer => retailer.bit === bitsFilter);
    }

    // Filter by search query using debounced value
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(retailer =>
        retailer.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        retailer.phone.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [retailers, bitsFilter, debouncedSearchQuery]);

  // Load retailers on component mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRetailers();
    }, [loadRetailers])
  );

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleRetailerPress = useCallback((retailer: Retailer) => {
    router.push({
      pathname: '/orders/new-order',
      params: { 
        retailerName: retailer.name,
        retailerPhone: retailer.phone,
        retailerBit: retailer.bit
      }
    });
  }, [router]);

  const handleEditRetailer = useCallback((retailer: Retailer) => {
    router.push({
      pathname: '/retailers/edit-retailer',
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
              // Reload retailers after deletion
              await loadRetailers();
              Alert.alert('Success', 'Retailer deleted successfully');
            } catch (error) {
              console.error('Error deleting retailer:', error);
              Alert.alert('Error', 'Failed to delete retailer. Please try again.');
            }
          },
        },
      ]
    );
  }, [loadRetailers]);

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
    router.push('/retailers/new-retailer');
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Search Bar */}
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFilterPress={handleOpenFilterModal}
      />

      {/* Retailers List */}
      <ScrollView style={styles.retailersContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.retailersHeader}>
          <Text style={styles.retailersTitle}>
            Retailers ({filteredRetailers.length})
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddRetailer}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.retailersList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading retailers...</Text>
            </View>
          ) : filteredRetailers.length > 0 ? (
            filteredRetailers.map((retailer) => (
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
              <Ionicons name="storefront-outline" size={64} color="#ccc" />
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
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  retailersList: {
    gap: 12,
    paddingBottom: 20,
  },
  retailerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retailerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retailerInfo: {
    flex: 1,
  },
  retailerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  retailerPhone: {
    fontSize: 14,
    color: '#666666',
  },
  bitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  bitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
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