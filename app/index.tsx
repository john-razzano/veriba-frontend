import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useProveStore } from '@/src/store/prove-store';

export default function IndexRoute() {
  const isAuthenticated = useProveStore((state) => state.isAuthenticated);
  const restoreSession = useProveStore((state) => state.restoreSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restoreSession()
      .catch(() => {})
      .finally(() => setReady(true));
  }, [restoreSession]);

  if (!ready) {
    return <View />;
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
