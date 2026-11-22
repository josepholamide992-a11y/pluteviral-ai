import * as SecureStore from 'expo-secure-store';

export async function getSavedSettings(): Promise<[string, string]> {
  const [origin, key] = await Promise.all([
    SecureStore.getItemAsync('pluteviral_origin'),
    SecureStore.getItemAsync('pluteviral_api_key'),
  ]);
  return [origin || '', key || ''];
}
export async function saveSavedSettings(origin: string, key: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('pluteviral_origin', origin),
    SecureStore.setItemAsync('pluteviral_api_key', key),
  ]);
}
