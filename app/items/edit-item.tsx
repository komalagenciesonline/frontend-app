import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Brand, Product } from '../../utils/api';

export default function EditItemScreen() {
  const router = useRouter();
  const { productData } = useLocalSearchParams<{ productData: string }>();
  
  // Parse the product data
  const product: Product = productData ? JSON.parse(productData) : null;
  
  const [productName, setProductName] = useState(product?.name || '');
  const [open, setOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(product?.brandName || '');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

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

  // Create brand options for dropdown
  const brandOptions = brands.map(brand => ({
    label: brand.name,
    value: brand.name
  }));

  const handleUpdateProduct = async () => {
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

    setIsUpdating(true);

    try {
      let brandToUse: Brand;

      if (newBrandName.trim()) {
        // Create new brand
        const newBrand = await api.brands.create({
          name: newBrandName.trim(),
          image: 'https://via.placeholder.com/100x100?text=' + encodeURIComponent(newBrandName.trim())
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
              // Navigate back to items screen
              router.back();
            }
          }
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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Form */}
        <View style={styles.formContainer}>
          {/* Brand Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand Name *</Text>
            <View style={styles.dropdownContainer}>
               <DropDownPicker
                 open={open}
                 value={selectedBrand}
                 items={brandOptions}
                 setOpen={setOpen}
                 setValue={setSelectedBrand}
                 placeholder=""
                 style={styles.dropdownPicker}
                 dropDownContainerStyle={styles.dropdownContainerStyle}
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
                 listMode="SCROLLVIEW"
                 maxHeight={300}
                 scrollViewProps={{
                   nestedScrollEnabled: true,
                 }}
               />
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
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              value={productName}
              onChangeText={setProductName}
              autoCapitalize="words"
            />
          </View>
        </View>
      </ScrollView>

      {/* Update Button */}
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
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownPicker: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e5ea',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
  },
  dropdownContainerStyle: {
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
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  tickIcon: {
    width: 16,
    height: 16,
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
