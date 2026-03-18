import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { colors } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';

export default function TabsLayout() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.copper,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderLight,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
