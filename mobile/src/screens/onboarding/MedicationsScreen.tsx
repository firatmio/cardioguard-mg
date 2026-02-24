// =============================================================================
// Onboarding Step 3: Medications
// =============================================================================
// Collects: current medications
// Free-form list with add/remove.
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
import { Pill, ArrowRight, ArrowLeft, Plus, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

const commonMedications = [
  'Aspirin',
  'Metoprolol',
  'Lisinopril',
  'Atorvastatin',
  'Metformin',
  'Warfarin',
  'Amlodipine',
  'Losartan',
];

export default function MedicationsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const prevData = route?.params?.data || {};

  const [medications, setMedications] = useState<string[]>(prevData.medications || []);
  const [customMed, setCustomMed] = useState('');

  const toggleMed = (med: string) => {
    if (medications.includes(med)) {
      setMedications(medications.filter((m) => m !== med));
    } else {
      setMedications([...medications, med]);
    }
  };

  const addCustomMed = () => {
    const trimmed = customMed.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications([...medications, trimmed]);
    }
    setCustomMed('');
  };

  const handleNext = () => {
    navigation.navigate('OnboardingEmergencyContact', {
      data: {
        ...prevData,
        medications,
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
            <View style={[styles.progressDot, styles.progressDone]} />
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 3 / 4</Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Pill size={22} color="#fff" />
            </View>
            <Text style={styles.title}>Medications</Text>
            <Text style={styles.subtitle}>
              List the medications you take regularly.
              This information is important for medical evaluation.
            </Text>
          </View>

          {/* Quick-select chips */}
          <Text style={styles.sectionTitle}>Common Medications</Text>
          <Text style={styles.sectionHint}>Select the ones you use (optional)</Text>
          <View style={styles.chipGrid}>
            {commonMedications.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, medications.includes(m) && styles.chipActive]}
                onPress={() => toggleMed(m)}
              >
                <Text
                  style={[
                    styles.chipText,
                    medications.includes(m) && styles.chipTextActive,
                  ]}
                >
                  {m}
                </Text>
                {medications.includes(m) && <X size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom medication input */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Add</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Enter medication name..."
              placeholderTextColor={colors.textTertiary}
              value={customMed}
              onChangeText={setCustomMed}
              onSubmitEditing={addCustomMed}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCustomMed}>
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Selected custom meds */}
          {medications.filter((m) => !commonMedications.includes(m)).length > 0 && (
            <View style={[styles.chipGrid, { marginTop: 12 }]}>
              {medications
                .filter((m) => !commonMedications.includes(m))
                .map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, styles.chipActive]}
                    onPress={() => toggleMed(m)}
                  >
                    <Text style={[styles.chipText, styles.chipTextActive]}>{m}</Text>
                    <X size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Summary */}
          {medications.length > 0 && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                {medications.length} medication(s) selected
              </Text>
            </View>
          )}
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
    backgroundColor: colors.warning,
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
  summaryBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
