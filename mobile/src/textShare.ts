import { Share } from 'react-native';
export async function shareText(message: string): Promise<void> {
  await Share.share({ message });
}
