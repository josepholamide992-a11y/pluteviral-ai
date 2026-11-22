// Browser previews do not persist master API keys.
export async function getSavedSettings(): Promise<[string, string]> {
  return [window.sessionStorage.getItem('pluteviral_origin') || '', ''];
}
export async function saveSavedSettings(origin: string, _key: string): Promise<void> {
  window.sessionStorage.setItem('pluteviral_origin', origin);
}
