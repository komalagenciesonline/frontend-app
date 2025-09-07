import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Retailer } from '../../utils/api';

export default function RetailersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('all');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bits options for dropdown picker
  const bits = [
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

  // Load retailers data
  const loadRetailers = useCallback(async () => {
    try {
      setIsLoading(true);
      const retailersData = await api.retailers.getAll(
        value === 'all' ? undefined : value,
        searchQuery || undefined
      );
      setRetailers(retailersData);
    } catch (error) {
      console.error('Error loading retailers:', error);
      Alert.alert('Error', 'Failed to load retailers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [value, searchQuery]);

  // Load retailers on component mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRetailers();
    }, [loadRetailers])
  );

  // Handle delete retailer
  const handleDeleteRetailer = async (retailer: Retailer) => {
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
  };

  // Since we're now filtering on the server side, we can use retailers directly
  const filteredRetailers = retailers;

  const BitsChooser = () => (
    <View style={styles.bitsChooserContainer}>
      <DropDownPicker
        open={open}
        value={value}
        items={bits}
        setOpen={setOpen}
        setValue={setValue}
        placeholder="Select Bit"
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
          initialNumToRender: 9,
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
          placeholder="Search retailers..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  const RetailerCard = ({ retailer }: { retailer: Retailer }) => (
    <View style={styles.retailerCard}>
      <TouchableOpacity 
        style={styles.retailerContent}
        onPress={() => router.push({
          pathname: '/orders/new-order',
          params: { 
            retailerName: retailer.name,
            retailerPhone: retailer.phone,
            retailerBit: retailer.bit
          }
        })}
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
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteRetailer(retailer)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header with Bits Chooser */}
      <View style={styles.header}>
        <BitsChooser />
      </View>

      {/* Search Bar */}
      <SearchBar />

      {/* Retailers List */}
      <ScrollView style={styles.retailersContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.retailersHeader}>
          <Text style={styles.retailersTitle}>
            Retailers ({filteredRetailers.length})
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/retailers/new-retailer')}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.retailersList}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading retailers...</Text>
            </View>
          ) : filteredRetailers.length > 0 ? (
            filteredRetailers.map((retailer) => (
              <RetailerCard key={retailer._id} retailer={retailer} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No retailers found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or bit selection</Text>
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
  },
  bitsChooserContainer: {
    position: 'relative',
    zIndex: 1000,
    width: '100%',
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
    padding: 16,
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
});
