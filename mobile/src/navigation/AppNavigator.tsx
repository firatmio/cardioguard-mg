// =============================================================================
// App Navigator
// =============================================================================
// Conditional navigation based on auth state:
//   1. Not logged in → Auth Stack (Welcome, Login, Register)
//   2. Logged in, onboarding incomplete → Onboarding Stack
//   3. Logged in, onboarding complete → Main Tab Navigator
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Heart, ClipboardList, Smartphone, Settings } from 'lucide-react-native';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Onboarding screens
import PersonalInfoScreen from '../screens/onboarding/PersonalInfoScreen';
import MedicalHistoryScreen from '../screens/onboarding/MedicalHistoryScreen';
import MedicationsScreen from '../screens/onboarding/MedicationsScreen';
import EmergencyContactScreen from '../screens/onboarding/EmergencyContactScreen';

// Main screens
import DashboardScreen from '../screens/DashboardScreen';
import ECGMonitorScreen from '../screens/ECGMonitorScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DeviceScreen from '../screens/DeviceScreen';
import SettingsScreen from '../screens/SettingsScreen';

import LocalDatabase from '../services/storage/LocalDatabase';
import NotificationService from '../services/notifications/NotificationService';
import { useAuth } from '../context/AuthContext';
import { colors, fontSize, fontWeight } from '../constants/theme';
import type { AuthStackParamList, OnboardingStackParamList, RootTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// ── Auth Navigator ──────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Onboarding Navigator ────────────────────────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <OnboardingStack.Screen name="OnboardingPersonalInfo" component={PersonalInfoScreen} />
      <OnboardingStack.Screen name="OnboardingMedicalHistory" component={MedicalHistoryScreen} />
      <OnboardingStack.Screen name="OnboardingMedications" component={MedicationsScreen} />
      <OnboardingStack.Screen name="OnboardingEmergencyContact" component={EmergencyContactScreen} />
    </OnboardingStack.Navigator>
  );
}

// ── Main Tab Navigator ──────────────────────────────────────────────────────

function MainTabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const db = LocalDatabase.getInstance();
        const count = await db.getUnreadEventCount('current-patient');
        setUnreadCount(count);
      } catch {
        // Non-fatal
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 80,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 6 : 20,
          paddingHorizontal: 12,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Monitor"
        component={ECGMonitorScreen}
        options={{
          tabBarLabel: 'EKG',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
      <Tab.Screen
        name="Device"
        component={DeviceScreen}
        options={{
          tabBarLabel: 'Device',
          tabBarIcon: ({ color }) => <Smartphone size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ──────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { user, loading, onboardingComplete } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // ── Push notification tap handler ──────────────────────────────────────
  // Navigate to the relevant screen when the user taps a notification.
  useEffect(() => {
    if (!user || !onboardingComplete) return;

    const notifService = NotificationService.getInstance();
    const cleanup = notifService.addNotificationResponseListener((eventId) => {
      if (!navigationRef.current) return;

      // Navigate to History tab to see the event
      try {
        navigationRef.current.navigate('History');
      } catch {
        // Navigation not ready yet
      }
    });

    return cleanup;
  }, [user, onboardingComplete]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading CardioGuard...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!user ? (
        <AuthNavigator />
      ) : !onboardingComplete ? (
        <OnboardingNavigator />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
