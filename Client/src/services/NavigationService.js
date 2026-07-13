/**
 * Client/src/services/NavigationService.js
 * 
 * Global navigation utility to trigger screen navigation from context and service layers.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
