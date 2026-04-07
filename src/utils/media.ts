import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import type { CapturedPhoto } from '@/src/types';

export async function pickCapturedPhoto(
  source: 'camera' | 'library'
): Promise<CapturedPhoto | null> {
  if (source === 'camera') {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (!cameraPermission.granted) {
      throw new Error('Camera access is required to capture photos.');
    }
  } else {
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!mediaPermission.granted) {
      throw new Error('Photo library access is required to select photos.');
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
          selectionLimit: 1,
        });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const imageData = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: 'base64',
  });
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    imageData
  );
  const timestamp = new Date().toISOString();
  const coordinates = await getCaptureCoordinates();
  const fileName =
    asset.uri
      .split('/')
      .pop()
      ?.split('?')[0] ?? `capture-${Date.now()}.jpg`;

  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? 'image/jpeg',
    capturedAt: timestamp,
    hash,
    coordinates,
    source,
    uploaded: false,
  };
}

export async function buildCombinedHash(...parts: string[]) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, parts.join(':'));
}

export async function getCaptureCoordinates() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  try {
    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.LocationAccuracy.Balanced,
    });

    return {
      lat: currentPosition.coords.latitude,
      lng: currentPosition.coords.longitude,
    };
  } catch {
    return null;
  }
}
