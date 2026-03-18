import { Redirect, Stack } from 'expo-router';

import { useProveStore } from '@/src/store/prove-store';

export default function AuthLayout() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
