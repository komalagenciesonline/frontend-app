import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const SPLASH_DURATION_MS = 3500;

const FEATURES = [
  { icon: 'clipboard-outline' as const, label: 'Orders' },
  { icon: 'storefront-outline' as const, label: 'Retailers' },
  { icon: 'cube-outline' as const, label: 'Items' },
];

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.stagger(
        120,
        featureAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION_MS - 300,
      delay: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const orbLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2800,
            delay,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    orbLoop(orb1, 0).start();
    orbLoop(orb2, 600).start();

    const timer = setTimeout(() => setShouldRedirect(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/(tabs)" />;
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      <LinearGradient
        colors={['#0A1628', '#122A4A', '#1A3D6B']}
        style={styles.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        {/* Ambient orbs */}
        <Animated.View
          style={[
            styles.orb,
            styles.orbTop,
            {
              opacity: orb1.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] }),
              transform: [
                {
                  scale: orb1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            styles.orbBottom,
            {
              opacity: orb2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.38] }),
              transform: [
                {
                  scale: orb2.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.95] }),
                },
              ],
            },
          ]}
        />

        {/* Grid accent lines */}
        <View style={styles.gridOverlay} pointerEvents="none">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.gridLine, { top: height * 0.15 + i * 80 }]} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.main,
            {
              opacity: fadeAnim,
              transform: [{ translateY: cardSlide }, { scale: cardScale }],
            },
          ]}
        >
          {/* Logo mark */}
          <View style={styles.logoRing}>
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="storefront" size={44} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.logoBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Brand name */}
          <Text style={styles.brandKomal}>KOMAL</Text>
          <Text style={styles.brandAgencies}>Agencies</Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ORDER MANAGEMENT</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Feature chips */}
          <View style={styles.chipRow}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.label}
                style={[
                  styles.chip,
                  {
                    opacity: featureAnims[index],
                    transform: [
                      {
                        translateY: featureAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name={feature.icon} size={16} color="#007AFF" />
                <Text style={styles.chipText}>{feature.label}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <View style={styles.footerMeta}>
            <Text style={styles.versionText}>v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2026 Komal Agencies</Text>
          </View>
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
    paddingHorizontal: 28,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#007AFF',
  },
  orbTop: {
    width: width * 0.85,
    height: width * 0.85,
    top: -width * 0.35,
    right: -width * 0.25,
  },
  orbBottom: {
    width: width * 0.7,
    height: width * 0.7,
    bottom: -width * 0.2,
    left: -width * 0.3,
    backgroundColor: '#3D8BFD',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  main: {
    alignItems: 'center',
    width: '100%',
  },
  logoRing: {
    marginBottom: 28,
    position: 'relative',
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A1628',
  },
  brandKomal: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    lineHeight: 42,
  },
  brandAgencies: {
    fontSize: 32,
    fontWeight: '300',
    color: '#7EB8FF',
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 2.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 28,
    right: 28,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
  },
});
