import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order, OrderItem } from '../../utils/api';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderData } = useLocalSearchParams<{ 
    orderData: string;
  }>();
  
  const [order, setOrder] = React.useState<Order | null>(null);

  // Parse order data from params
  React.useEffect(() => {
    if (orderData) {
      try {
        const parsedOrder = JSON.parse(orderData);
        setOrder(parsedOrder);
      } catch (error) {
        console.error('Error parsing order data:', error);
      }
    }
  }, [orderData]);

  const getTotalItems = () => {
    if (!order?.items) return 0;
    return order.items.reduce((total, item) => total + item.quantity, 0);
  };

  const OrderItemCard = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItemCard}>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>{item.productName}</Text>
        <Text style={styles.orderItemBrand}>{item.brandName}</Text>
      </View>
      
      <View style={styles.orderItemDetails}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Text style={styles.unitText}>{item.unit}</Text>
        </View>
      </View>
    </View>
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading order details...</Text>
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
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Order Info Section */}
        <View style={styles.orderInfoSection}>
          <View style={styles.orderInfoHeader}>
            <Ionicons name="receipt-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Order Information</Text>
          </View>
          
          <View style={styles.orderInfoContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Number:</Text>
              <Text style={styles.infoValue}>{order.orderNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{order.date}</Text>
            </View>
            
            {order.time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>{order.time}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: order.status === 'Completed' ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Items:</Text>
              <Text style={styles.infoValue}>{getTotalItems()}</Text>
            </View>
          </View>
        </View>

        {/* Retailer Information Section */}
        <View style={styles.retailerSection}>
          <View style={styles.retailerHeader}>
            <Ionicons name="storefront-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Retailer Information</Text>
          </View>
          
          <View style={styles.retailerInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Retailer Name:</Text>
              <Text style={styles.infoValue}>{order.counterName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Phone No:</Text>
              <Text style={styles.infoValue}>+91 9876543210</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Retailer Bit:</Text>
              <Text style={styles.infoValue}>{order.bit}</Text>
            </View>
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.orderItemsSection}>
          <View style={styles.orderItemsHeader}>
            <Ionicons name="cube-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Order Items</Text>
            <Text style={styles.itemsCount}>({order.items?.length || 0})</Text>
          </View>
          
          <View style={styles.orderItemsList}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <OrderItemCard key={`${item.productId}-${item.unit}-${index}`} item={item} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No items in this order</Text>
              </View>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  
  // Order Info Section
  orderInfoSection: {
    backgroundColor: '#ffffff',
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderInfoHeader: {
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
  orderInfoContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Retailer Section
  retailerSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retailerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  retailerInfo: {
    gap: 16,
  },
  
  // Order Items Section
  orderItemsSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  orderItemsList: {
    gap: 12,
  },
  orderItemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 14,
    color: '#666666',
  },
  orderItemDetails: {
    alignItems: 'flex-end',
  },
  quantityContainer: {
    alignItems: 'center',
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
});
