import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ProductAnalytics, PopularProduct, ProductDistribution, RecentActivity } from '../../utils/api';


// Popular Products List Component
const PopularProductsList = ({ products }: { products: PopularProduct[] }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Top Products</Text>
    <View style={styles.productsList}>
      {products.slice(0, 5).map((product, index) => (
        <View key={`${product._id.productName}-${product._id.brandName}`} style={styles.productItem}>
          <View style={styles.productRank}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product._id.productName}</Text>
            <Text style={styles.productBrand}>{product._id.brandName}</Text>
          </View>
          <View style={styles.productStats}>
            <Text style={styles.statValue}>{product.orderCount}</Text>
            <Text style={styles.statLabel}>orders</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);


// Recent Activity List Component
const RecentActivityList = ({ activities }: { activities: RecentActivity[] }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Recent Activity</Text>
    <View style={styles.activityList}>
      {activities.slice(0, 5).map((activity, index) => (
        <View key={`${activity._id.productName}-${activity._id.brandName}`} style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Ionicons name="trending-up-outline" size={16} color="#34C759" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityProduct}>{activity._id.productName}</Text>
            <Text style={styles.activityBrand}>{activity._id.brandName}</Text>
          </View>
          <View style={styles.activityStats}>
            <Text style={styles.activityCount}>{activity.recentOrderCount}</Text>
            <Text style={styles.activityLabel}>orders</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

export default function ItemAnalyticsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics data states
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [productDistribution, setProductDistribution] = useState<ProductDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Load all analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [
        analyticsData,
        popularData,
        distributionData,
        activityData
      ] = await Promise.all([
        api.products.getAnalytics.overview(),
        api.products.getAnalytics.popular(10),
        api.products.getAnalytics.distribution(),
        api.products.getAnalytics.recentActivity(7)
      ]);

      setAnalytics(analyticsData);
      setPopularProducts(popularData);
      setProductDistribution(distributionData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  }, [loadAnalyticsData]);


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
        <Text style={styles.headerTitle}>Product Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>

            {/* Brand Distribution */}
            {productDistribution.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Products by Brand</Text>
                <View style={styles.distributionList}>
                  {productDistribution.slice(0, 5).map((brand, index) => (
                    <View key={brand._id} style={styles.distributionItem}>
                      <View style={styles.distributionRank}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.distributionInfo}>
                        <Text style={styles.distributionBrand}>{brand._id}</Text>
                        <Text style={styles.distributionCount}>{brand.productCount} products</Text>
                      </View>
                      <View style={styles.distributionBar}>
                        <View 
                          style={[
                            styles.distributionBarFill, 
                            { width: `${(brand.productCount / Math.max(...productDistribution.map(b => b.productCount))) * 100}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Products */}
            {popularProducts.length > 0 && (
              <PopularProductsList products={popularProducts} />
            )}


            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <RecentActivityList activities={recentActivity} />
            )}
          </>
        )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  distributionList: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  distributionRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  distributionInfo: {
    flex: 1,
  },
  distributionBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  distributionCount: {
    fontSize: 14,
    color: '#666666',
  },
  distributionBar: {
    width: 60,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  productsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  productBrand: {
    fontSize: 14,
    color: '#666666',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FFF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityProduct: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  activityBrand: {
    fontSize: 14,
    color: '#666666',
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  activityLabel: {
    fontSize: 12,
    color: '#666666',
  },
});
