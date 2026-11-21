import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';
import { colors, fonts, radii, shadow } from '../../../constants/theme';

export default function BrandsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Track last fetch time to avoid unnecessary refetches
  const lastFetchTimeRef = useRef<number | null>(null);

  // Load brands (no staleness check here)
  const loadBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      const brandsData = await api.brands.getAll();
      setBrands(brandsData);
      lastFetchTimeRef.current = Date.now(); // Mark data as fresh
    } catch (error) {
      console.error('Error loading brands:', error);
      Alert.alert('Error', 'Failed to load brands. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Store latest loadBrands in ref (though it doesn't change, for consistency)
  const loadBrandsRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    loadBrandsRef.current = loadBrands;
  }, [loadBrands]);

  // Load brands when screen comes into focus (only if data is stale)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const lastFetch = lastFetchTimeRef.current;
      
      // Only skip if data is fresh (less than 30 seconds old)
      if (lastFetch !== null && (now - lastFetch) < 30000) {
        return; // Data is still fresh, skip refetch
      }
      
      // Data is stale or first load, fetch fresh data using ref to avoid dependency issues
      if (loadBrandsRef.current) {
        loadBrandsRef.current();
      }
    }, []) // Empty deps - use ref to access latest loadBrands
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
              markListDirty('items');
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
        <Ionicons name="search-outline" size={20} color={colors.inkMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brands..."
          placeholderTextColor={colors.inkFaint}
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
          <Ionicons name="business-outline" size={24} color={colors.brand} />
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
            <Ionicons name="reorder-three-outline" size={20} color={colors.brand} />
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Brands Management</Text>
        <TouchableOpacity 
          style={[styles.cleanupButton, isCleaningUp && styles.cleanupButtonDisabled]}
          onPress={handleBrandCleanup}
          disabled={isCleaningUp}
        >
          <Ionicons name="trash-outline" size={20} color={isCleaningUp ? colors.inkFaint : colors.danger} />
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
              <Ionicons name="business-outline" size={64} color={colors.inkFaint} />
              <Text style={styles.emptyText}>No brands found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search</Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={colors.brand} />
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
    backgroundColor: colors.bg,
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    flex: 1,
    textAlign: 'center',
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sans,
    color: colors.ink,
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
    fontFamily: fonts.display,
    color: colors.ink,
  },
  brandsList: {
    gap: 12,
    paddingBottom: 20,
  },
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
    padding: 16,
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
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
    gap: 4,
  },
  brandName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  productCount: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
  },
  brandActions: {
    alignItems: 'flex-end',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  manageButtonText: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
  },
  emptyBrandBadge: {
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyBrandText: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.danger,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  infoSection: {
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: colors.brandSoft,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
  },
  infoContent: {
    flex: 1,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.brand,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
    lineHeight: 20,
  },
});
