import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  SESSION: "user-session",
  AUTH_TOKEN: "auth-token",
};

const PRODUCTS_KEY = "products";

export const storageService = {
  saveSession: async (session) => {
    try {
      await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      if (session?.access_token) {
        await AsyncStorage.setItem(KEYS.AUTH_TOKEN, session.access_token);
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  },

  getSession: async () => {
    try {
      const sessionStr = await AsyncStorage.getItem(KEYS.SESSION);
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  },

  clearSession: async () => {
    try {
      await AsyncStorage.multiRemove([KEYS.SESSION, KEYS.AUTH_TOKEN]);
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  },

  async getProducts() {
    try {
      const products = await AsyncStorage.getItem(PRODUCTS_KEY);
      return products ? JSON.parse(products) : [];
    } catch (error) {
      console.error("Error reading products:", error);
      return [];
    }
  },

  async saveProducts(products) {
    try {
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error("Error saving products:", error);
    }
  },
};
