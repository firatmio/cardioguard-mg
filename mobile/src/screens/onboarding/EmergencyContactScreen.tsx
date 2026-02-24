// =============================================================================
// Onboarding Step 4: Emergency Contact
// =============================================================================
// Collects: emergency contact name, phone, relationship.
// Final step — saves all data and completes onboarding.
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useAuth, type PatientOnboardingData } from '../../context/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

const relationOptions = [
  'Spouse',
  'Mother',
  'Father',
  'Sibling',
  'Child',
  'Friend',
  'Other',
];

export default function EmergencyContactScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const prevData = route?.params?.data || {};
  const { setOnboardingComplete } = useAuth();

  const [contactName, setContactName] = useState(prevData.emergencyContactName || '');
  const [contactPhone, setContactPhone] = useState(prevData.emergencyContactPhone || '');
  const [contactRelation, setContactRelation] = useState(prevData.emergencyContactRelation || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      setError('Emergency contact name and phone are required.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const fullData: PatientOnboardingData = {
        ...prevData,
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactPhone.trim(),
        emergencyContactRelation: contactRelation || 'Not specified',
      };

      await setOnboardingComplete(fullData);
      // Navigation will automatically switch to MainTabs
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setSaving(false);
    }
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
            <View style={[styles.progressDot, styles.progressDone]} />
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressActive]} />
          </View>
          <Text style={styles.stepLabel}>Step 4 / 4</Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Phone size={22} color="#fff" />
            </View>
            <Text style={styles.title}>Emergency Contact</Text>
            <Text style={styles.subtitle}>
              Specify a person to be reached in case of emergency.
              This person will be notified.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Name *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Contact's full name"
                  placeholderTextColor={colors.textTertiary}
                  value={contactName}
                  onChangeText={setContactName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="+90 5XX XXX XX XX"
                  placeholderTextColor={colors.textTertiary}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relationship</Text>
              <View style={styles.relationGrid}>
                {relationOptions.map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationChip,
                      contactRelation === rel && styles.relationChipActive,
                    ]}
                    onPress={() => setContactRelation(rel)}
                  >
                    <Text
                      style={[
                        styles.relationChipText,
                        contactRelation === rel && styles.relationChipTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <CheckCircle size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Almost Ready!</Text>
              <Text style={styles.summaryText}>
                All your information will be stored securely and will only be viewable by your doctor.
              </Text>
            </View>
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
            style={[styles.completeButton, saving && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleComplete}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </>
            )}
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
    backgroundColor: colors.success,
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
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.sm,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    height: '100%',
  },
  relationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  relationChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  relationChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  relationChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: 16,
    marginTop: 28,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
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
  completeButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
});
