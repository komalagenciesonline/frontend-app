import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';
import { colors, fonts } from '../../../constants/theme';

interface SelectedItem {
  productId: string;
  productName: string;
  brandName: string;
  unit: 'Pc' | 'Outer' | 'Case';
  quantity: number;
  productNotes?: string;
}

export default function OrderSummaryScreen() {
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { 
    retailerName, 
    retailerPhone, 
    retailerBit,
    orderItems,
    orderDate 
  } = useLocalSearchParams<{ 
    retailerName: string;
    retailerPhone: string;
    retailerBit: string;
    orderItems: string;
    orderDate: string;
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
        items: parsedOrderItems,
        orderDate: orderDate
      });

      Alert.alert(
        'Order Confirmed!', 
        `Order ${newOrder.orderNumber} has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              markListDirty('orders');
              router.navigate('/(tabs)/orders');
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
        {item.productNotes && item.productNotes.trim() && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.productNotes}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <Text style={styles.unitText}>{item.unit}</Text>
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
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Retailer Information */}
      <View style={styles.retailerSection}>
        <View style={styles.retailerHeader}>
          <Ionicons name="storefront" size={24} color={colors.brand} />
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
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date:</Text>
            <Text style={styles.infoValue}>
              {orderDate ? new Date(orderDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Items */}
      <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.itemsHeader}>
          <View style={styles.itemsTitleRow}>
            <Ionicons name="cube-outline" size={24} color={colors.brand} />
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
            <Ionicons name="cube-outline" size={64} color={colors.line} />
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
    width: 34,
  },
  retailerSection: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  retailerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
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
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
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
    fontFamily: fonts.sansSemi,
    color: colors.brand,
  },
  itemsList: {
    gap: 12,
    paddingBottom: 20,
  },
  orderItemCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 14,
    fontFamily: fonts.display,
    color: colors.inkMuted,
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.bg,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.brand,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 18,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    marginBottom: 2,
  },
  unitText: {
    fontSize: 14,
    fontFamily: fonts.sansSemi,
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
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.white,
    textAlign: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.lineStrong,
  },
});
