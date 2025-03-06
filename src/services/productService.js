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
      const isOnline = await productService.checkIsOnline();

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
      const isOnline = await productService.checkIsOnline();

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
      const isOnline = await productService.checkIsOnline();

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
      const isOnline = await productService.checkIsOnline();

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

  // NEW METHODS FOR STOCK MANAGEMENT

  /**
   * Update stock for a single product
   * @param {string|number} productId - The product ID
   * @param {number} newStockQuantity - The new stock quantity
   * @returns {Promise<boolean>} Success status
   */
  async updateProductStock(productId, newStockQuantity) {
    try {
      const isOnline = await productService.checkIsOnline();

      if (isOnline) {
        const { data, error } = await supabase
          .from("products")
          .update({ stock: newStockQuantity })
          .eq("id", productId)
          .select()
          .single();

        if (error) throw error;

        // Update local storage
        const products = await storageService.getProducts();
        const updated = products.map((p) =>
          p.id === productId ? { ...p, stock: newStockQuantity } : p
        );
        await storageService.saveProducts(updated);
        return true;
      }

      // Offline: Update locally only
      const products = await storageService.getProducts();
      const updated = products.map((p) =>
        p.id === productId ? { ...p, stock: newStockQuantity } : p
      );
      await storageService.saveProducts(updated);
      return true;
    } catch (error) {
      console.error("Error updating product stock:", error);
      return false;
    }
  },

  /**
   * Update stock for multiple products in batch
   * @param {Array<{productId: string|number, newStock: number}>} updates - Array of updates
   * @returns {Promise<boolean>} Success status
   */
  async batchUpdateProductStock(updates) {
    try {
      const isOnline = await productService.checkIsOnline();

      if (isOnline) {
        // Online: Update each product in Supabase
        for (const update of updates) {
          const { error } = await supabase
            .from("products")
            .update({ stock: update.newStock })
            .eq("id", update.productId);

          if (error) {
            console.error(
              `Error updating stock for product ${update.productId}:`,
              error
            );
          }
        }
      }

      // Always update local storage
      const products = await storageService.getProducts();
      const updatedProducts = products.map((product) => {
        const update = updates.find((u) => u.productId === product.id);
        if (update) {
          return { ...product, stock: update.newStock };
        }
        return product;
      });

      await storageService.saveProducts(updatedProducts);
      return true;
    } catch (error) {
      console.error("Error batch updating product stock:", error);
      return false;
    }
  },

  /**
   * Get current stock for a product
   * @param {string|number} productId - The product ID
   * @returns {Promise<number|null>} Current stock or null if not found
   */
  async getProductStock(productId) {
    try {
      const isOnline = await productService.checkIsOnline();

      if (isOnline) {
        const { data, error } = await supabase
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();

        if (error) throw error;
        return data?.stock ?? null;
      }

      // Offline: Check local storage
      const products = await storageService.getProducts();
      const product = products.find((p) => p.id === productId);
      return product?.stock ?? null;
    } catch (error) {
      console.error("Error getting product stock:", error);
      return null;
    }
  },

  /**
   * Check if there's enough stock for a transaction
   * @param {Array<{id: string|number, quantity: number}>} items - Cart items
   * @returns {Promise<{success: boolean, message: string, insufficientItems: Array}>}
   */
  async checkStockAvailability(items) {
    try {
      const insufficientItems = [];
      const products = await productService.getProducts();

      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product || product.stock < item.quantity) {
          insufficientItems.push({
            id: item.id,
            name: product?.name || `Product #${item.id}`,
            requested: item.quantity,
            available: product?.stock || 0,
          });
        }
      }

      if (insufficientItems.length > 0) {
        return {
          success: false,
          message: "Some items have insufficient stock",
          insufficientItems,
        };
      }

      return {
        success: true,
        message: "Stock is available",
        insufficientItems: [],
      };
    } catch (error) {
      console.error("Error checking stock availability:", error);
      return {
        success: false,
        message: "Error checking stock availability",
        insufficientItems: [],
      };
    }
  },

  /**
   * Deduct stock after checkout
   * @param {Array<{id: string|number, quantity: number}>} items - Cart items
   * @returns {Promise<boolean>} Success status
   */
  async deductStockAfterCheckout(items) {
    try {
      // First check if there's enough stock
      const stockCheck = await productService.checkStockAvailability(items);
      if (!stockCheck.success) {
        console.error(
          "Cannot deduct stock:",
          stockCheck.message,
          stockCheck.insufficientItems
        );
        return false;
      }

      // Prepare stock updates
      const products = await productService.getProducts();
      const updates = items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          productId: item.id,
          newStock: Math.max(0, (product?.stock || 0) - item.quantity),
        };
      });

      // Update stocks
      return await productService.batchUpdateProductStock(updates);
    } catch (error) {
      console.error("Error deducting stock after checkout:", error);
      return false;
    }
  },
};
