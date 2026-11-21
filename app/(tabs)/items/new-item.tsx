import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';
import { colors, fonts } from '../../../constants/theme';

const ACCENT = colors.brand;

export default function NewItemScreen() {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  
  // Animation for dropdown chevron
  const [brandChevronAnim] = useState(new Animated.Value(0));

  // Dropdown animation functions
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

  // Load brands on component mount
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

  const handleCreateProduct = async () => {
    // Validation
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

    setIsCreating(true);

    try {
      let brandToUse: Brand;

      if (newBrandName.trim()) {
        // Create new brand
        const newBrand = await api.brands.create({
          name: newBrandName.trim(),
        });
        brandToUse = newBrand;
      } else {
        // Find the selected brand
        const selectedBrandData = brands.find(brand => brand.name === selectedBrand);
        if (!selectedBrandData) {
          Alert.alert('Error', 'Selected brand not found');
          return;
        }
        brandToUse = selectedBrandData;
      }

      const newProduct = {
        name: productName.trim(),
        brandId: brandToUse._id,
        brandName: brandToUse.name,
      };

      await api.products.create(newProduct);

      Alert.alert(
        'Success!',
        'Product created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              markListDirty('items');
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

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
        <Text style={styles.headerTitle}>New Product</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Form */}
        <View style={styles.formContainer}>
          {/* Brand Selection */}
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

          {/* OR Label */}
          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* New Brand Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Brand Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new brand name"
              placeholderTextColor={colors.inkFaint}
              value={newBrandName}
              onChangeText={setNewBrandName}
              autoCapitalize="words"
            />
          </View>

          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter product name"
              placeholderTextColor={colors.inkFaint}
              value={productName}
              onChangeText={setProductName}
              autoCapitalize="words"
            />
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateProduct}
          disabled={isCreating}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create Product'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  placeholder: {
    fontFamily: fonts.sansMedium,
    width: 34, // Same width as back button for centering
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
    fontFamily: fonts.sansSemi,
    color: colors.ink,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  floatingLabelInputWrap: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 2,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
    fontSize: 18,
    fontFamily: fonts.sans,
  },
  dropdownPicker: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    flex: 1,
  },
  dropdownPickerEmphasis: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  inlineDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.line,
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
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    textAlign: 'center',
  },
  inlineDropdownOptionTextSelected: {
    fontFamily: fonts.sansSemi,
    color: colors.white,
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
  bottomContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  createButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: colors.lineStrong,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.white,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  orText: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    marginHorizontal: 16,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
  },
});
