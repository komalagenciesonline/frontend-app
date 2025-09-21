import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Retailer } from '../../utils/api';

export default function EditRetailerScreen() {
  const router = useRouter();
  const { retailerData } = useLocalSearchParams<{ retailerData: string }>();
  
  // Parse retailer data from params
  const retailer: Retailer = retailerData ? JSON.parse(retailerData) : null;
  
  const [retailerName, setRetailerName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedBit, setSelectedBit] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Bits options for dropdown
  const bits = [
    { label: 'Turori', value: 'Turori' },
    { label: 'Naldurg & Jalkot', value: 'Naldurg & Jalkot' },
    { label: 'Gunjoti & Murum', value: 'Gunjoti & Murum' },
    { label: 'Dalimb & Yenegur', value: 'Dalimb & Yenegur' },
    { label: 'Sastur & Makhani', value: 'Sastur & Makhani' },
    { label: 'Narangwadi & Killari', value: 'Narangwadi & Killari' },
    { label: 'Andur', value: 'Andur' },
    { label: 'Omerga', value: 'Omerga' },
  ];

  // Initialize form with retailer data (only once)
  useEffect(() => {
    if (retailer && !isInitialized) {
      setRetailerName(retailer.name);
      setPhoneNo(retailer.phone);
      setSelectedBit(retailer.bit);
      setIsInitialized(true);
    }
  }, [retailer, isInitialized]);

  const handleUpdateRetailer = async () => {
    // Validation
    if (!retailerName.trim()) {
      Alert.alert('Error', 'Please enter retailer name');
      return;
    }
    
    if (!phoneNo.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }
    
    if (!selectedBit) {
      Alert.alert('Error', 'Please select a bit');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNo)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsUpdating(true);

    try {
      const updatedRetailer = {
        name: retailerName.trim(),
        phone: phoneNo.trim(),
        bit: selectedBit,
      };

      await api.retailers.update(retailer._id, updatedRetailer);

      Alert.alert(
        'Success!',
        'Retailer updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to retailers screen
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating retailer:', error);
      Alert.alert('Error', 'Failed to update retailer. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Show error if no retailer data
  if (!retailer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Retailer</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Error</Text>
          <Text style={styles.errorSubtext}>No retailer data found</Text>
          <TouchableOpacity 
            style={styles.backButtonError}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Edit Retailer</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Form */}
        <View style={styles.formContainer}>
          {/* Retailer Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Retailer Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter retailer name"
              placeholderTextColor="#999"
              value={retailerName}
              onChangeText={setRetailerName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone No *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              value={phoneNo}
              onChangeText={setPhoneNo}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {/* Select Bit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Bit *</Text>
            <View style={styles.dropdownContainer}>
               <DropDownPicker
                 open={open}
                 value={selectedBit}
                 items={bits}
                 setOpen={setOpen}
                 setValue={(value) => setSelectedBit(value)}
                 placeholder="Select a bit"
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
        </View>
      </ScrollView>

      {/* Update Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateRetailer}
          disabled={isUpdating}
        >
          <Text style={styles.updateButtonText}>
            {isUpdating ? 'Updating...' : 'Update Retailer'}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  backButtonError: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
