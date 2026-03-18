import { Redirect, Stack } from 'expo-router';

import { useProveStore } from '@/src/store/prove-store';

export default function WizardLayout() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
