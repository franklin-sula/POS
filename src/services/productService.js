import { supabase } from "../lib/supabase";
import { storageService } from "./storageService";
import NetInfo from "@react-native-community/netinfo";

export const productService = {
  async checkIsOnline() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  },

  async getProducts() {
    try {
      const isOnline = await productService.checkIsOnline(); // ✅ FIXED

      if (isOnline) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        await storageService.saveProducts(data); // Sync to local storage
        return data;
      }

      // Offline: return from local storage
      return await storageService.getProducts();
    } catch (error) {
      console.error("Error fetching products:", error);
      return await storageService.getProducts();
    }
  },

  async createProduct(product) {
    try {
      const isOnline = await productService.checkIsOnline(); // ✅ FIXED

      if (isOnline) {
        const { data, error } = await supabase
          .from("products")
          .insert(product)
          .select()
          .single();

        if (error) throw error;

        // Update local storage
        const products = await storageService.getProducts();
        await storageService.saveProducts([data, ...products]);
        return data;
      }

      // Offline: Store locally with temporary ID
      const products = await storageService.getProducts();
      const newProduct = {
        ...product,
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      await storageService.saveProducts([newProduct, ...products]);
      return newProduct;
    } catch (error) {
      throw error;
    }
  },

  async updateProduct(id, product) {
    try {
      const isOnline = await productService.checkIsOnline(); // ✅ FIXED

      if (isOnline) {
        const { data, error } = await supabase
          .from("products")
          .update(product)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        // Update local storage
        const products = await storageService.getProducts();
        const updated = products.map((p) => (p.id === id ? data : p));
        await storageService.saveProducts(updated);
        return data;
      }

      // Offline: Update locally
      const products = await storageService.getProducts();
      const updated = products.map((p) =>
        p.id === id ? { ...p, ...product } : p
      );
      await storageService.saveProducts(updated);
      return { id, ...product };
    } catch (error) {
      throw error;
    }
  },

  async deleteProduct(id) {
    try {
      const isOnline = await productService.checkIsOnline(); // ✅ FIXED

      if (isOnline) {
        const { error } = await supabase.from("products").delete().eq("id", id);

        if (error) throw error;
      }

      // Always remove from local storage
      const products = await storageService.getProducts();
      const filtered = products.filter((p) => p.id !== id);
      await storageService.saveProducts(filtered);
      return true;
    } catch (error) {
      throw error;
    }
  },
};
