import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';

export default function TabsLayout() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);
  const isMember = useProveStore((state) => state.user?.role === 'member');

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
          title: isMember ? 'Explore' : 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name={isMember ? 'compass-outline' : 'home-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: isMember ? undefined : null,
          title: 'Search',
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: isMember ? undefined : null,
          title: 'Inbox',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          href: isMember ? null : undefined,
          title: '',
          tabBarIcon: () => (
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.copper,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: colors.copper,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: isMember ? undefined : null,
          title: 'Saved',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bookmark-outline" size={20} color={color} />
          ),
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
