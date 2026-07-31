import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand, Product } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';

const ACCENT = '#3D5AFE';

export default function EditItemScreen() {
  const router = useRouter();
  const { productData } = useLocalSearchParams<{ productData: string }>();

  const product: Product = productData ? JSON.parse(productData) : null;

  const [productName, setProductName] = useState(product?.name || '');
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(product?.brandName || '');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const [brandChevronAnim] = useState(new Animated.Value(0));

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

  React.useEffect(() => {
    const loadBrands = async () => {
      try {
        const brandsData = await api.brands.getAll();
        setBrands(brandsData);
      } catch (error) {
        console.error('Error loading brands:', error);
        Alert.alert('Error', 'Failed to load brands. Please try again.');
      }
    };
    loadBrands();
  }, []);

  const handleUpdateProduct = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }

    if (!selectedBrand && !newBrandName.trim()) {
      Alert.alert('Error', 'Please select an existing brand or enter a new brand name');
      return;
    }

    if (selectedBrand && newBrandName.trim()) {
      Alert.alert('Error', 'Please select either an existing brand OR enter a new brand name, not both');
      return;
    }

    setIsUpdating(true);

    try {
      let brandToUse: Brand;

      if (newBrandName.trim()) {
        const newBrand = await api.brands.create({
          name: newBrandName.trim(),
          image:
            'https://via.placeholder.com/100x100?text=' + encodeURIComponent(newBrandName.trim()),
        });
        brandToUse = newBrand;
      } else {
        const selectedBrandData = brands.find((brand) => brand.name === selectedBrand);
        if (!selectedBrandData) {
          Alert.alert('Error', 'Selected brand not found');
          return;
        }
        brandToUse = selectedBrandData;
      }

      const updatedProduct = {
        name: productName.trim(),
        brandId: brandToUse._id,
        brandName: brandToUse.name,
      };

      await api.products.update(product._id, updatedProduct);

      Alert.alert(
        'Success!',
        'Product updated successfully. If you changed the brand and the old brand had no other products, it has been automatically deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              markListDirty('items');
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand Name *</Text>
            <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
              <Pressable
                style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]}
                onPress={brandDropdownOpen ? closeBrandDropdown : openBrandDropdown}
              >
                <Text style={styles.inputIcon}>🏷️</Text>
                <Text style={styles.dropdownPickerText}>
                  {selectedBrand || 'Select Brand'}
                </Text>
                <Animated.View
                  style={{ marginLeft: 8, transform: [{ rotate: brandChevronRotate }] }}
                >
                  <Ionicons name="chevron-down" size={18} color={ACCENT} />
                </Animated.View>
              </Pressable>
              {brandDropdownOpen && (
                <>
                  <Pressable style={styles.dropdownOverlay} onPress={closeBrandDropdown} />
                  <Animated.View
                    style={[
                      styles.inlineDropdown,
                      {
                        opacity: brandChevronAnim,
                        transform: [
                          {
                            translateY: brandChevronAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-10, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <ScrollView
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {brands.map((brand) => (
                        <Pressable
                          key={brand._id}
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            selectedBrand === brand.name && styles.inlineDropdownOptionSelected,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => {
                            setSelectedBrand(brand.name);
                            closeBrandDropdown();
                          }}
                        >
                          <Text
                            style={[
                              styles.inlineDropdownOptionText,
                              selectedBrand === brand.name &&
                                styles.inlineDropdownOptionTextSelected,
                            ]}
                          >
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

          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Brand Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new brand name"
              placeholderTextColor="#999"
              value={newBrandName}
              onChangeText={setNewBrandName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter product name"
              placeholderTextColor="#999"
              value={productName}
              onChangeText={setProductName}
              autoCapitalize="words"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateProduct}
          disabled={isUpdating}
        >
          <Text style={styles.updateButtonText}>
            {isUpdating ? 'Updating...' : 'Update Product'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  placeholder: {
    width: 34,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingTop: 30,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  floatingLabelInputWrap: {
    marginBottom: 16,
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
    paddingVertical: 16,
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
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5ea',
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginHorizontal: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
