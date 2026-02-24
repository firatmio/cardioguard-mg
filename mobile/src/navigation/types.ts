// =============================================================================
// Navigation Type Definitions
// =============================================================================

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

/**
 * Auth stack — Welcome, Login, Register
 */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

/**
 * Onboarding stack — Patient info collection steps
 */
export type OnboardingStackParamList = {
  OnboardingPersonalInfo: { data?: any };
  OnboardingMedicalHistory: { data?: any };
  OnboardingMedications: { data?: any };
  OnboardingEmergencyContact: { data?: any };
};

/**
 * Root tab navigator parameter list.
 * Each tab screen and its expected route params are defined here.
 */
export type RootTabParamList = {
  Dashboard: undefined;
  Monitor: undefined;
  History: { eventId?: string } | undefined;
  Device: undefined;
  Settings: undefined;
};

/**
 * Type helper for screen component props.
 * Usage: const MyScreen: React.FC<TabScreenProps<'Dashboard'>> = ({ navigation }) => { ... }
 */
export type TabScreenProps<T extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;
