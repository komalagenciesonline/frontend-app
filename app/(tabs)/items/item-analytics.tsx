import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand, PendingOrderItem, PendingOrderItemsResponse } from '../../../utils/api';

const ACCENT = "#3D5AFE";

interface UnitSectionProps {
  title: string;
  items: PendingOrderItem[];
  total: number;
  icon: string;
  color: string;
}

const UnitSection = ({ title, items, total, icon, color }: UnitSectionProps) => (
  <View style={styles.unitSection}>
    {items.length > 0 ? (
      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View key={`${item.productId}-${item.unit}-${index}`} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemProductName}>{item.productName}</Text>
              <Text style={styles.itemBrandName}>{item.brandName}</Text>
            </View>
            <View style={[styles.itemQuantity, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.itemQuantityText, { color }]}>{item.totalQuantity}</Text>
            </View>
          </View>
        ))}
      </View>
    ) : (
      <View style={styles.emptyUnit}>
        <Text style={styles.emptyUnitText}>No items in {title}</Text>
      </View>
    )}
  </View>
);

export default function ItemAnalyticsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PendingOrderItemsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'Pc' | 'Outer' | 'Case'>('Pc');
  
  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedBit, setSelectedBit] = useState<string>('all');
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Dropdown states
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [bitDropdownOpen, setBitDropdownOpen] = useState(false);
  
  // Animation for dropdowns
  const [brandChevronAnim] = useState(new Animated.Value(0));
  const [bitChevronAnim] = useState(new Animated.Value(0));
  
  // Bits options
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
  
  // Dropdown animation functions for Brand
  const openBrandDropdown = () => {
    setBrandDropdownOpen(true);
    Animated.timing(brandChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  
  const closeBrandDropdown = () => {
    Animated.timing(brandChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setBrandDropdownOpen(false));
  };
  
  const brandChevronRotate = brandChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  // Dropdown animation functions for Bit
  const openBitDropdown = () => {
    setBitDropdownOpen(true);
    Animated.timing(bitChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  
  const closeBitDropdown = () => {
    Animated.timing(bitChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setBitDropdownOpen(false));
  };
  
  const bitChevronRotate = bitChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const brandsData = await api.brands.getAll();
        setBrands(brandsData);
      } catch (error) {
        console.error('Error loading brands:', error);
      }
    };
    loadBrands();
  }, []);

  const loadPendingItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.orders.getPendingItems(
        selectedBrand === 'all' ? undefined : selectedBrand,
        selectedBit === 'all' ? undefined : selectedBit
      );
      setData(response);
    } catch (error) {
      console.error('Error loading pending items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand, selectedBit]);

  // Reload when screen comes into focus (handles both initial mount and refocus)
  useFocusEffect(
    useCallback(() => {
      loadPendingItems();
    }, [loadPendingItems])
  );

  // Reload when filters change (when screen is already focused)
  useEffect(() => {
    loadPendingItems();
  }, [selectedBrand, selectedBit]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPendingItems();
    setRefreshing(false);
  }, [loadPendingItems]);

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
        <Text style={styles.headerTitle}>Pending Order Items</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading pending items...</Text>
        </View>
      ) : data ? (
        <>
          {/* Filters */}
          <View style={styles.filtersContainer}>
            {/* Brand Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Brand</Text>
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Pressable 
                  style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} 
                  onPress={brandDropdownOpen ? closeBrandDropdown : openBrandDropdown}
                >
                  <Text style={styles.inputIcon}>🏷️</Text>
                  <Text style={styles.dropdownPickerText}>
                    {selectedBrand === 'all' ? 'All Brands' : selectedBrand}
                  </Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: brandChevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {brandDropdownOpen && (
                  <>
                    <Pressable 
                      style={styles.dropdownOverlay} 
                      onPress={closeBrandDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: brandChevronAnim,
                          transform: [
                            { translateY: brandChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ]
                        }
                      ]}
                    >
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        <Pressable
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            selectedBrand === 'all' && styles.inlineDropdownOptionSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => {
                            setSelectedBrand('all');
                            closeBrandDropdown();
                          }}
                        >
                          <Text style={[
                            styles.inlineDropdownOptionText,
                            selectedBrand === 'all' && styles.inlineDropdownOptionTextSelected
                          ]}>
                            All Brands
                          </Text>
                        </Pressable>
                        {brands.map((brand) => (
                          <Pressable
                            key={brand._id}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              selectedBrand === brand.name && styles.inlineDropdownOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              setSelectedBrand(brand.name);
                              closeBrandDropdown();
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownOptionText,
                              selectedBrand === brand.name && styles.inlineDropdownOptionTextSelected
                            ]}>
                              {brand.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  </>
                )}
              </View>
            </View>

            {/* Bit Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Bit</Text>
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Pressable 
                  style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} 
                  onPress={bitDropdownOpen ? closeBitDropdown : openBitDropdown}
                >
                  <Text style={styles.inputIcon}>📍</Text>
                  <Text style={styles.dropdownPickerText}>
                    {bitsOptions.find(b => b.value === selectedBit)?.label || 'All Bits'}
                  </Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: bitChevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {bitDropdownOpen && (
                  <>
                    <Pressable 
                      style={styles.dropdownOverlay} 
                      onPress={closeBitDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: bitChevronAnim,
                          transform: [
                            { translateY: bitChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ]
                        }
                      ]}
                    >
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {bitsOptions.map((bit) => (
                          <Pressable
                            key={bit.value}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              selectedBit === bit.value && styles.inlineDropdownOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              setSelectedBit(bit.value);
                              closeBitDropdown();
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownOptionText,
                              selectedBit === bit.value && styles.inlineDropdownOptionTextSelected
                            ]}>
                              {bit.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Pc' && styles.tabActive]}
              onPress={() => setActiveTab('Pc')}
            >
              <Text style={[styles.tabText, activeTab === 'Pc' && styles.tabTextActive]}>
                Pieces (Pc)
              </Text>
              {activeTab === 'Pc' && (
                <View style={[styles.tabIndicator, { backgroundColor: '#007AFF' }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Outer' && styles.tabActive]}
              onPress={() => setActiveTab('Outer')}
            >
              <Text style={[styles.tabText, activeTab === 'Outer' && styles.tabTextActive]}>
                Outer
              </Text>
              {activeTab === 'Outer' && (
                <View style={[styles.tabIndicator, { backgroundColor: '#34C759' }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Case' && styles.tabActive]}
              onPress={() => setActiveTab('Case')}
            >
              <Text style={[styles.tabText, activeTab === 'Case' && styles.tabTextActive]}>
                Case
              </Text>
              {activeTab === 'Case' && (
                <View style={[styles.tabIndicator, { backgroundColor: '#FF9500' }]} />
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollContainer}
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
            {activeTab === 'Pc' && (
              <UnitSection
                title="Pieces (Pc)"
                items={data.items.Pc}
                total={data.totals.Pc}
                icon="cube-outline"
                color="#007AFF"
              />
            )}
            {activeTab === 'Outer' && (
              <UnitSection
                title="Outer"
                items={data.items.Outer}
                total={data.totals.Outer}
                icon="cube-outline"
                color="#34C759"
              />
            )}
            {activeTab === 'Case' && (
              <UnitSection
                title="Case"
                items={data.items.Case}
                total={data.totals.Case}
                icon="cube-outline"
                color="#FF9500"
              />
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No pending orders</Text>
          <Text style={styles.emptySubtext}>All orders have been completed</Text>
        </View>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  floatingLabelInputWrap: {
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 2,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
    fontSize: 18,
  },
  dropdownPicker: {
    backgroundColor: '#f3f6fa',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownPickerEmphasis: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  inlineDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    zIndex: 1000,
  },
  inlineDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  inlineDropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  inlineDropdownOptionText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  inlineDropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#f8f9fa',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  unitSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemBrandName: {
    fontSize: 14,
    color: '#666666',
  },
  itemQuantity: {
    minWidth: 60,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemQuantityText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyUnit: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyUnitText: {
    fontSize: 14,
    color: '#999999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
