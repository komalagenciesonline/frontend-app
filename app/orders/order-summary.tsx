import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../utils/api';

interface SelectedItem {
  productId: string;
  productName: string;
  brandName: string;
  unit: 'Pc' | 'Outer' | 'Case';
  quantity: number;
}

export default function OrderSummaryScreen() {
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { 
    retailerName, 
    retailerPhone, 
    retailerBit,
    orderItems 
  } = useLocalSearchParams<{ 
    retailerName: string;
    retailerPhone: string;
    retailerBit: string;
    orderItems: string;
  }>();

  // Parse the order items from the URL params
  const parsedOrderItems: SelectedItem[] = orderItems ? JSON.parse(orderItems) : [];

  const getTotalItems = () => {
    return parsedOrderItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleConfirmOrder = async () => {
    if (parsedOrderItems.length === 0) {
      Alert.alert('Error', 'Please add items to your order before confirming.');
      return;
    }

    setIsCreatingOrder(true);
    
    try {
      const newOrder = await api.orders.create({
        counterName: retailerName || 'Unknown Retailer',
        bit: retailerBit || 'Unknown Bit',
        totalItems: getTotalItems(),
        totalAmount: 0, // You can calculate this based on item prices if needed
        items: parsedOrderItems
      });

      Alert.alert(
        'Order Confirmed!', 
        `Order ${newOrder.orderNumber} has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to orders screen
              router.push('/(tabs)/orders');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const OrderItemCard = ({ item }: { item: SelectedItem }) => (
    <View style={styles.orderItemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.brandName}>{item.brandName}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <Text style={styles.unitText}>{item.unit}</Text>
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
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Retailer Information */}
      <View style={styles.retailerSection}>
        <View style={styles.retailerHeader}>
          <Ionicons name="storefront" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Retailer Information</Text>
        </View>
        
        <View style={styles.retailerInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{retailerName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{retailerPhone || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Order Items */}
      <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.itemsHeader}>
          <View style={styles.itemsTitleRow}>
            <Ionicons name="cube-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>
          <Text style={styles.totalItemsText}>
            Total Items: {getTotalItems()}
          </Text>
        </View>
        
        <View style={styles.itemsList}>
          {parsedOrderItems.map((item, index) => (
            <OrderItemCard key={`${item.productId}-${item.unit}-${index}`} item={item} />
          ))}
        </View>
        
        {parsedOrderItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No items in order</Text>
            <Text style={styles.emptySubtext}>Go back to add items to your order</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Back to Order</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmButton, isCreatingOrder && styles.confirmButtonDisabled]}
          onPress={handleConfirmOrder}
          disabled={isCreatingOrder}
        >
          <Text style={styles.confirmButtonText}>
            {isCreatingOrder ? 'Creating Order...' : 'Confirm Order'}
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
  retailerSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  retailerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  retailerInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  itemsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  itemsList: {
    gap: 12,
    paddingBottom: 20,
  },
  orderItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 14,
    color: '#666666',
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
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
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
  },
});
