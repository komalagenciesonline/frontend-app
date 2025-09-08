import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Product } from '../../utils/api';

export default function ItemsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [brandOptions, setBrandOptions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Load products and brand options
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsData, brandNames] = await Promise.all([
        api.products.getAll(selectedBrand === 'all' ? undefined : selectedBrand, searchQuery || undefined),
        api.products.getUniqueBrandNames()
      ]);
      
      setProducts(productsData);
      
      // Create brand options for dropdown
      const options = [
        { label: 'All Brands', value: 'all' },
        ...brandNames.map(name => ({ label: name, value: name }))
      ];
      setBrandOptions(options);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand, searchQuery]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle delete product
  const handleDeleteProduct = async (product: Product) => {
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
              // Reload products after deletion
              await loadData();
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
  };

  // Handle brand cleanup
  const handleBrandCleanup = async () => {
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
              // Reload data to reflect changes
              await loadData();
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
  };

  // Since we're now filtering on the server side, we can use products directly
  const filteredProducts = products;

  const BrandFilter = () => (
    <View style={styles.brandFilterContainer}>
      <DropDownPicker
        open={open}
        value={selectedBrand}
        items={brandOptions}
        setOpen={setOpen}
        setValue={setSelectedBrand}
        placeholder="Select Brand"
        style={styles.dropdownPicker}
        dropDownContainerStyle={styles.dropdownContainer}
        textStyle={styles.dropdownText}
        arrowIconStyle={styles.arrowIcon}
        tickIconStyle={styles.tickIcon}
        zIndex={3000}
        zIndexInverse={1000}
        dropDownDirection="BOTTOM"
        closeAfterSelecting={true}
        showTickIcon={true}
        showArrowIcon={true}
        searchable={false}
        listMode="FLATLIST"
        maxHeight={400}
        flatListProps={{
          initialNumToRender: 10,
        }}
      />
    </View>
  );

  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  const ProductCard = ({ product }: { product: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productContent}>
        <View style={styles.brandBadge}>
          <Ionicons name="business-outline" size={16} color="#007AFF" />
          <Text style={styles.brandText}>{product.brandName}</Text>
        </View>
        
        <Text style={styles.productName}>{product.name}</Text>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push({
            pathname: '/items/edit-item',
            params: {
              productData: JSON.stringify(product)
            }
          })}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteProduct(product)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header with Brand Filter */}
      <View style={styles.header}>
        <BrandFilter />
        <TouchableOpacity 
          style={[styles.cleanupButton, isCleaningUp && styles.cleanupButtonDisabled]}
          onPress={handleBrandCleanup}
          disabled={isCleaningUp}
        >
          <Ionicons name="trash-outline" size={20} color={isCleaningUp ? "#999" : "#FF3B30"} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <SearchBar />

      {/* Products List */}
      <ScrollView style={styles.productsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>
            Products ({filteredProducts.length})
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.brandsButton}
              onPress={() => router.push('/brands')}
            >
              <Ionicons name="business-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/items/new-item')}
            >
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.productsList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or brand selection</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    gap: 12,
  },
  brandFilterContainer: {
    position: 'relative',
    zIndex: 1000,
    flex: 1,
  },
  cleanupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanupButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  dropdownPicker: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 40,
  },
  dropdownContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e5ea',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  tickIcon: {
    width: 16,
    height: 16,
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
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  productsList: {
    gap: 12,
    paddingBottom: 20,
  },
  productCard: {
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
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
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
});
