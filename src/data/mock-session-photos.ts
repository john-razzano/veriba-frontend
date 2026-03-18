import { Image } from 'react-native';

function assetUri(moduleId: number) {
  return Image.resolveAssetSource(moduleId).uri;
}

export const MOCK_SESSION_PHOTOS = {
  session01: assetUri(require('../../assets/images/mock-sessions/session-01.jpg')),
  session02: assetUri(require('../../assets/images/mock-sessions/session-02.jpg')),
  session03: assetUri(require('../../assets/images/mock-sessions/session-03.jpg')),
  session04: assetUri(require('../../assets/images/mock-sessions/session-04.jpg')),
  session05: assetUri(require('../../assets/images/mock-sessions/session-05.jpg')),
  session06: assetUri(require('../../assets/images/mock-sessions/session-06.jpg')),
  session07: assetUri(require('../../assets/images/mock-sessions/session-07.jpg')),
  session08: assetUri(require('../../assets/images/mock-sessions/session-08.jpg')),
} as const;
