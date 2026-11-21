import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { colors, fonts } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: {
          fontFamily: fonts.sansSemi,
          fontSize: 11,
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontSize: 18,
          color: colors.ink,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: colors.brandSoft,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  : undefined
              }
            >
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            </View>
          ),
          headerTitle: 'Komal Agencies',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: colors.brandSoft,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  : undefined
              }
            >
              <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
            </View>
          ),
          headerTitle: 'Orders',
        }}
      />
      <Tabs.Screen
        name="retailers"
        options={{
          title: 'Retailers',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: colors.brandSoft,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  : undefined
              }
            >
              <Ionicons
                name={focused ? 'storefront' : 'storefront-outline'}
                size={size}
                color={color}
              />
            </View>
          ),
          headerTitle: 'Retailers',
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: colors.brandSoft,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  : undefined
              }
            >
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={size} color={color} />
            </View>
          ),
          headerTitle: 'Items',
        }}
      />
    </Tabs>
  );
}
