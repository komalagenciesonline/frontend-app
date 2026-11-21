import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { markListDirty } from '../../../utils/listRefresh';
import { colors, fonts } from '../../../constants/theme';

const ACCENT = colors.brand;

const BITS = [
  'Turori',
  'Naldurg & Jalkot',
  'Gunjoti & Murum',
  'Dalimb & Yenegur',
  'Sastur & Makhani',
  'Narangwadi & Killari',
  'Andur',
  'Omerga',
];

export default function NewRetailerScreen() {
  const router = useRouter();
  const [retailerName, setRetailerName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [bitDropdownOpen, setBitDropdownOpen] = useState(false);
  const [selectedBit, setSelectedBit] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [bitChevronAnim] = useState(new Animated.Value(0));

  const openBitDropdown = () => {
    setBitDropdownOpen(true);
    Animated.timing(bitChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeBitDropdown = () => {
    Animated.timing(bitChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setBitDropdownOpen(false));
  };

  const bitChevronRotate = bitChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleCreateRetailer = async () => {
    if (!retailerName.trim()) {
      Alert.alert('Error', 'Please enter retailer name');
      return;
    }

    if (!phoneNo.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    if (!selectedBit) {
      Alert.alert('Error', 'Please select a bit');
      return;
    }

    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNo)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsCreating(true);

    try {
      const newRetailer = {
        name: retailerName.trim(),
        phone: phoneNo.trim(),
        bit: selectedBit,
      };

      await api.retailers.create(newRetailer);

      Alert.alert('Success!', 'Retailer created successfully', [
        {
          text: 'OK',
          onPress: () => {
            markListDirty('retailers');
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating retailer:', error);
      Alert.alert('Error', 'Failed to create retailer. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Retailer</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!bitDropdownOpen}
        contentContainerStyle={bitDropdownOpen ? styles.scrollContentDropdownOpen : undefined}
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Retailer Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter retailer name"
              placeholderTextColor={colors.inkFaint}
              value={retailerName}
              onChangeText={setRetailerName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone No *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              placeholderTextColor={colors.inkFaint}
              value={phoneNo}
              onChangeText={setPhoneNo}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Bit *</Text>
            <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
              <Pressable
                style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]}
                onPress={bitDropdownOpen ? closeBitDropdown : openBitDropdown}
              >
                <Text style={styles.inputIcon}>📍</Text>
                <Text style={styles.dropdownPickerText}>
                  {selectedBit || 'Select Bit'}
                </Text>
                <Animated.View style={{ marginLeft: 8, transform: [{ rotate: bitChevronRotate }] }}>
                  <Ionicons name="chevron-down" size={18} color={ACCENT} />
                </Animated.View>
              </Pressable>
              {bitDropdownOpen && (
                <>
                  <Animated.View
                    style={[
                      styles.inlineDropdown,
                      {
                        opacity: bitChevronAnim,
                        transform: [
                          {
                            translateY: bitChevronAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-10, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <ScrollView
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {BITS.map((bit) => (
                        <Pressable
                          key={bit}
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            selectedBit === bit && styles.inlineDropdownOptionSelected,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => {
                            setSelectedBit(bit);
                            closeBitDropdown();
                          }}
                        >
                          <Text
                            style={[
                              styles.inlineDropdownOptionText,
                              selectedBit === bit && styles.inlineDropdownOptionTextSelected,
                            ]}
                          >
                            {bit}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </Animated.View>
                  <Pressable style={styles.dropdownOverlay} onPress={closeBitDropdown} />
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateRetailer}
          disabled={isCreating}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create Retailer'}
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentDropdownOpen: {
    paddingBottom: 220,
  },
  formContainer: {
    paddingTop: 30,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.sansSemi,
    color: colors.ink,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  floatingLabelInputWrap: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 2,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
    fontSize: 18,
    fontFamily: fonts.sans,
  },
  dropdownPicker: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    flex: 1,
  },
  dropdownPickerEmphasis: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  inlineDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.line,
    zIndex: 1000,
  },
  inlineDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  inlineDropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  inlineDropdownOptionText: {
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    textAlign: 'center',
  },
  inlineDropdownOptionTextSelected: {
    fontFamily: fonts.sansSemi,
    color: colors.white,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  bottomContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  createButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: colors.lineStrong,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.white,
  },
});
