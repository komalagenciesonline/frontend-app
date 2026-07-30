import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order, OrderItem } from '../../../utils/api';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderData, bitsFilter, statusFilter, dateFilter, searchQuery } = useLocalSearchParams<{
    orderData: string;
    bitsFilter?: string;
    statusFilter?: string;
    dateFilter?: string;
    searchQuery?: string;
  }>();

  const [order, setOrder] = React.useState<Order | null>(null);

  React.useEffect(() => {
    if (orderData) {
      try {
        setOrder(JSON.parse(orderData));
      } catch (error) {
        console.error('Error parsing order data:', error);
      }
    }
  }, [orderData]);

  const getTotalItems = () => {
    if (!order?.items) return 0;
    return order.items.reduce((total, item) => total + item.quantity, 0);
  };

  const handleEdit = () => {
    if (!order) return;
    router.push({
      pathname: '/(tabs)/orders/edit-order',
      params: {
        orderData: JSON.stringify(order),
        bitsFilter: bitsFilter || 'all',
        statusFilter: statusFilter || 'all',
        dateFilter: dateFilter || 'all',
        searchQuery: searchQuery || '',
      },
    });
  };

  const OrderItemCard = ({ item, index }: { item: OrderItem; index: number }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemIndexBadge}>
        <Text style={styles.itemIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <View style={styles.itemBrandRow}>
          <Ionicons name="business-outline" size={13} color="#8E8E93" />
          <Text style={styles.itemBrand}>{item.brandName}</Text>
        </View>
        {item.productNotes?.trim() ? (
          <View style={styles.notesBox}>
            <Ionicons name="document-text-outline" size={14} color="#007AFF" />
            <Text style={styles.notesText}>{item.productNotes}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.quantityPill}>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <Text style={styles.quantityUnit}>{item.unit}</Text>
      </View>
    </View>
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = order.status === 'Completed';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#636366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity style={styles.headerBtnEdit} onPress={handleEdit}>
          <Ionicons name="create-outline" size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.orderNumberBadge}>
              <Ionicons name="receipt-outline" size={14} color="#007AFF" />
              <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                isCompleted ? styles.statusCompleted : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isCompleted ? styles.statusTextCompleted : styles.statusTextPending,
                ]}
              >
                {order.status}
              </Text>
            </View>
          </View>

          <Text style={styles.retailerName}>{order.counterName}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={14} color="#007AFF" />
              <Text style={styles.metaChipText}>{order.bit}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
              <Text style={styles.metaChipText}>{order.date}</Text>
            </View>
            {order.time ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#8E8E93" />
                <Text style={styles.metaChipText}>{order.time}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{getTotalItems()}</Text>
              <Text style={styles.statLabel}>Total Qty</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{order.items?.length || 0}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
          </View>
        </View>

        {/* Items section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{order.items?.length || 0}</Text>
          </View>
        </View>

        {order.items && order.items.length > 0 ? (
          <View style={styles.itemsList}>
            {order.items.map((item, index) => (
              <OrderItemCard
                key={`${item.productId}-${item.unit}-${index}`}
                item={item}
                index={index}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={28} color="#007AFF" />
            </View>
            <Text style={styles.emptyTitle}>No items in this order</Text>
            <Text style={styles.emptySubtext}>This order has no products listed</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F4F7',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnEdit: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A1628',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.3,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#E8F9EE',
  },
  statusPending: {
    backgroundColor: '#FFF4E5',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#248A3D',
  },
  statusTextPending: {
    color: '#C93400',
  },
  retailerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A1628',
    lineHeight: 28,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636366',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E8ECF0',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A1628',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  itemIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 4,
  },
  itemBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemBrand: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#636366',
    lineHeight: 18,
  },
  quantityPill: {
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 52,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  quantityUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
