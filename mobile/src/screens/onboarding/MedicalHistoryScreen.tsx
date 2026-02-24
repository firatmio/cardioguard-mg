// =============================================================================
// Onboarding Step 2: Medical History
// =============================================================================
// Collects: existing conditions, allergies
// Chip-based multi-select with custom input option.
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeartPulse, ArrowRight, ArrowLeft, Plus, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

const commonConditions = [
  'Hypertension',
  'Diabetes',
  'Heart Failure',
  'Arrhythmia',
  'Coronary Artery Disease',
  'Asthma / COPD',
  'Thyroid Disorder',
  'High Cholesterol',
];

const commonAllergies = [
  'Penicillin',
  'Aspirin',
  'Ibuprofen',
  'Latex',
  'Pollen',
  'Food Allergy',
];

export default function MedicalHistoryScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const prevData = route?.params?.data || {};

  const [conditions, setConditions] = useState<string[]>(prevData.conditions || []);
  const [allergies, setAllergies] = useState<string[]>(prevData.allergies || []);
  const [customCondition, setCustomCondition] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustom = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setValue('');
  };

  const handleNext = () => {
    navigation.navigate('OnboardingMedications', {
      data: {
        ...prevData,
        conditions,
        allergies,
      },
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDone]} />
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 2 / 4</Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <HeartPulse size={22} color="#fff" />
            </View>
            <Text style={styles.title}>Medical History</Text>
            <Text style={styles.subtitle}>
              Indicate your current health conditions and allergies.
              This information will help your doctor.
            </Text>
          </View>

          {/* Conditions */}
          <Text style={styles.sectionTitle}>Existing Conditions</Text>
          <Text style={styles.sectionHint}>Select or add if applicable (optional)</Text>
          <View style={styles.chipGrid}>
            {commonConditions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, conditions.includes(c) && styles.chipActive]}
                onPress={() => toggleItem(conditions, setConditions, c)}
              >
                <Text
                  style={[
                    styles.chipText,
                    conditions.includes(c) && styles.chipTextActive,
                  ]}
                >
                  {c}
                </Text>
                {conditions.includes(c) && <X size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            {/* Custom conditions */}
            {conditions
              .filter((c) => !commonConditions.includes(c))
              .map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, styles.chipActive]}
                  onPress={() => toggleItem(conditions, setConditions, c)}
                >
                  <Text style={[styles.chipText, styles.chipTextActive]}>{c}</Text>
                  <X size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add another condition..."
              placeholderTextColor={colors.textTertiary}
              value={customCondition}
              onChangeText={setCustomCondition}
              onSubmitEditing={() =>
                addCustom(conditions, setConditions, customCondition, setCustomCondition)
              }
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                addCustom(conditions, setConditions, customCondition, setCustomCondition)
              }
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Allergies */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Allergies</Text>
          <Text style={styles.sectionHint}>Select or add if applicable (optional)</Text>
          <View style={styles.chipGrid}>
            {commonAllergies.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, allergies.includes(a) && styles.chipActive]}
                onPress={() => toggleItem(allergies, setAllergies, a)}
              >
                <Text
                  style={[
                    styles.chipText,
                    allergies.includes(a) && styles.chipTextActive,
                  ]}
                >
                  {a}
                </Text>
                {allergies.includes(a) && <X size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            {allergies
              .filter((a) => !commonAllergies.includes(a))
              .map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, styles.chipActive]}
                  onPress={() => toggleItem(allergies, setAllergies, a)}
                >
                  <Text style={[styles.chipText, styles.chipTextActive]}>{a}</Text>
                  <X size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add another allergy..."
              placeholderTextColor={colors.textTertiary}
              value={customAllergy}
              onChangeText={setCustomAllergy}
              onSubmitEditing={() =>
                addCustom(allergies, setAllergies, customAllergy, setCustomAllergy)
              }
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                addCustom(allergies, setAllergies, customAllergy, setCustomAllergy)
              }
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom nav */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            activeOpacity={0.85}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  progressActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressDone: {
    backgroundColor: colors.success,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressLineDone: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: fontWeight.medium,
    marginBottom: 24,
  },
  header: { marginBottom: 24 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    gap: 6,
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  nextButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    ...shadows.sm,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
});
