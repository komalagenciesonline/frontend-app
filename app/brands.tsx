import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand } from '../utils/api';

export default function BrandsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Load brands
  const loadBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      const brandsData = await api.brands.getAll();
      setBrands(brandsData);
    } catch (error) {
      console.error('Error loading brands:', error);
      Alert.alert('Error', 'Failed to load brands. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load brands on component mount
  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Reload brands when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBrands();
    }, [loadBrands])
  );

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
              // Reload brands to reflect changes
              await loadBrands();
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

  // Filter brands based on search query
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brands..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  const BrandCard = ({ brand }: { brand: Brand }) => (
    <View style={styles.brandCard}>
      <View style={styles.brandContent}>
        <View style={styles.brandImageContainer}>
          <Ionicons name="business-outline" size={24} color="#007AFF" />
        </View>
        
        <View style={styles.brandInfo}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.productCount}>
            {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
          </Text>
        </View>
      </View>
      
      <View style={styles.brandActions}>
        {brand.productCount > 0 && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => router.push({
              pathname: '/products/manage-products',
              params: {
                brandId: brand._id,
                brandName: brand.name
              }
            })}
          >
            <Ionicons name="reorder-three-outline" size={20} color="#007AFF" />
            <Text style={styles.manageButtonText}>Manage</Text>
          </TouchableOpacity>
        )}
        {brand.productCount === 0 && (
          <View style={styles.emptyBrandBadge}>
            <Text style={styles.emptyBrandText}>Empty</Text>
          </View>
        )}
      </View>
    </View>
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
        <Text style={styles.headerTitle}>Brands Management</Text>
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

      {/* Brands List */}
      <ScrollView style={styles.brandsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.brandsHeader}>
          <Text style={styles.brandsTitle}>
            Brands ({filteredBrands.length})
          </Text>
        </View>
        
        <View style={styles.brandsList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading brands...</Text>
            </View>
          ) : filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <BrandCard key={brand._id} brand={brand} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No brands found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search</Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Automatic Brand Cleanup</Text>
              <Text style={styles.infoText}>
                Brands with no products are automatically deleted when you delete their last product. 
                You can also manually trigger cleanup using the trash button above.
              </Text>
            </View>
          </View>
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
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
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
  brandsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  brandsHeader: {
    paddingVertical: 15,
  },
  brandsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  brandsList: {
    gap: 12,
    paddingBottom: 20,
  },
  brandCard: {
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
    justifyContent: 'space-between',
  },
  brandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  brandImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
    gap: 4,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  productCount: {
    fontSize: 14,
    color: '#666666',
  },
  brandActions: {
    alignItems: 'flex-end',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyBrandBadge: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyBrandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
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
  infoSection: {
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoContent: {
    flex: 1,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
});
