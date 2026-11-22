// Web-only test and preview storage. Native mobile keeps its SQLite store.
const draftStorage = {
  async getItem(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  },
};
export default draftStorage;
