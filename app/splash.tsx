import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StatusBar, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation for icon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for the loading indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Navigate to tabs after 3 seconds
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/(tabs)" />;
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD', '#1E5F99', '#0D4F8C']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Background Circles */}
        <View style={styles.backgroundDecorations}>
          <Animated.View 
            style={[
              styles.decorativeCircle, 
              styles.circle1,
              { 
                transform: [{ 
                  rotate: spin 
                }] 
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.decorativeCircle, 
              styles.circle2,
              { 
                transform: [{ 
                  rotate: spin 
                }] 
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.decorativeCircle, 
              styles.circle3,
              { 
                transform: [{ 
                  rotate: spin 
                }] 
              }
            ]} 
          />
        </View>

        {/* Main Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          {/* App Icon */}
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [{ rotate: spin }]
              }
            ]}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="storefront" size={60} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Company Name */}
          <Animated.Text 
            style={[
              styles.title,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            Komal Agencies
          </Animated.Text>

          {/* Subtitle with enhanced styling */}
          <Animated.Text 
            style={[
              styles.subtitle,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            Order Management System
          </Animated.Text>

          {/* Feature highlights */}
          <Animated.View 
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Easy Order Management</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="people" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Retailer Management</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Real-time Analytics</Text>
            </View>
          </Animated.View>

          {/* Loading Animation */}
          <Animated.View 
            style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { backgroundColor: '#FFD700' }]} />
              <Animated.View style={[styles.dot, { backgroundColor: '#FFA500' }]} />
              <Animated.View style={[styles.dot, { backgroundColor: '#FF8C00' }]} />
            </View>
            <Text style={styles.loadingText}>Loading...</Text>
          </Animated.View>
        </Animated.View>

        {/* Bottom Branding */}
        <Animated.View 
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 Komal Agencies</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backgroundDecorations: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    top: height * 0.1,
    left: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: '#FFD700',
    top: height * 0.7,
    right: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: '#FFA500',
    top: height * 0.3,
    right: width * 0.8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#E8F4FD',
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 200,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    color: '#E8F4FD',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  versionText: {
    color: '#E8F4FD',
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 5,
  },
  copyrightText: {
    color: '#E8F4FD',
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
});
