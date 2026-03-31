import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_jwt_token';

/**
 * SecureStorageService provides encrypted storage for sensitive authentication data.
 * Uses Expo SecureStore which leverages iOS Keychain and Android Keystore.
 * 
 * Security: Uses WHEN_UNLOCKED_THIS_DEVICE_ONLY for maximum security -
 * data is only accessible when device is unlocked and cannot be transferred
 * to other devices via backup.
 */
export const SecureStorageService = {

  async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  
  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async removeAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
