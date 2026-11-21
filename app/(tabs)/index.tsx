import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useRef } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, shadow } from '../../constants/theme';
import { api, DashboardStats, Order } from '../../utils/api';

const STALE_TIME_MS = 30000;

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  totalItems: 0,
  pendingOrders: 0,
  totalBits: 8,
};

export default function DashboardScreen() {
  const router = useRouter();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastFetchTimeRef = useRef<number | null>(null);

  const loadDashboard = useCallback(async (force = false) => {
    const now = Date.now();
    const lastFetch = lastFetchTimeRef.current;

    if (!force && lastFetch !== null && (now - lastFetch) < STALE_TIME_MS) {
      return;
    }

    try {
      setIsLoading(true);
      const [statsData, recentData] = await Promise.all([
        api.orders.getDashboardStats(),
        api.orders.getRecent(3),
      ]);
      setStats(statsData);
      setRecentOrders(recentData);
      lastFetchTimeRef.current = now;
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(true);
    setRefreshing(false);
  }, [loadDashboard]);

  const completedOrders = stats.totalOrders - stats.pendingOrders;

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const OrderCard = ({ order }: { order: Order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.counterName}>{order.counterName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: order.status === 'Completed' ? colors.successSoft : colors.warningSoft }
        ]}>
          <Text style={[
            styles.statusText,
            { color: order.status === 'Completed' ? colors.success : colors.warning }
          ]}>{order.status}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <View style={styles.orderDetailItem}>
          <Ionicons name="cube-outline" size={16} color={colors.inkMuted} />
          <Text style={styles.orderDetailText}>{order.totalItems} items</Text>
        </View>
        <View style={styles.orderDetailItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.inkMuted} />
          <Text style={styles.orderDetailText}>{order.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>KOMAL AGENCIES</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome to your trade desk</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon="receipt-outline"
            color={colors.brand}
          />
          <StatCard
            title="Completed Orders"
            value={completedOrders}
            icon="checkmark-circle-outline"
            color={colors.success}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon="time-outline"
            color={colors.warning}
          />
          <StatCard
            title="Total Bits"
            value={stats.totalBits}
            icon="location-outline"
            color={colors.purple}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.ordersList}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
              </View>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.inkFaint} />
                <Text style={styles.emptyText}>No orders yet</Text>
                <Text style={styles.emptySubtext}>Create your first order to see it here</Text>
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
    backgroundColor: colors.bg,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerEyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: fonts.displayExtra,
    color: colors.ink,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 10,
    width: '48%',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  statContent: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  statTitle: {
    fontSize: 13,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.brand,
    fontFamily: fonts.sansSemi,
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterName: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.inkMuted,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.inkMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.inkFaint,
    marginTop: 4,
    textAlign: 'center',
  },
});
