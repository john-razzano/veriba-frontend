import { Redirect } from 'expo-router';

import { useProveStore } from '@/src/store/prove-store';

export default function IndexRoute() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
