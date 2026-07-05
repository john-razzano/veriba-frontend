import { Redirect } from 'expo-router';

import { useProveStore } from '@/src/store/prove-store';

// Session restore happens in app/_layout.tsx before any route renders,
// so by the time this mounts the auth state is settled.
export default function IndexRoute() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
