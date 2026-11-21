import { Image } from 'expo-image';
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
import { colors, fonts, radii } from '../constants/theme';

const { width } = Dimensions.get('window');
const SPLASH_DURATION_MS = 2800;

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(riseAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION_MS - 400,
      delay: 200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => setShouldRedirect(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/(tabs)" />;
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <LinearGradient
        colors={[colors.bg, colors.surface, colors.brandSoft]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 0.32],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.main,
            {
              opacity: fadeAnim,
              transform: [{ translateY: riseAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoShell}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <Text style={styles.brand}>Komal Agencies</Text>
          <Text style={styles.tagline}>Orders · Retailers · Inventory</Text>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.loadingLabel}>Preparing your trade desk</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  glow: {
    position: 'absolute',
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: 999,
    backgroundColor: colors.brandMist,
    top: '28%',
  },
  main: {
    alignItems: 'center',
    width: '100%',
  },
  logoShell: {
    width: 128,
    height: 128,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  logo: {
    width: 112,
    height: 112,
  },
  brand: {
    fontFamily: fonts.displayExtra,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.inkMuted,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 999,
  },
  loadingLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.inkFaint,
  },
});
