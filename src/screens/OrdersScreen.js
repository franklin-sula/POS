import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, SafeAreaView } from "react-native";
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  Button,
  Divider,
  ActivityIndicator,
  Chip,
  Badge,
  TouchableRipple,
  Portal,
  Modal,
} from "react-native-paper";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/productService";
import { CameraView, useCameraPermissions } from "expo-camera";
import CheckoutModal from "../components/CheckoutModal";

const { width } = Dimensions.get("window");
const GRID_SIZE = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - (GRID_SIZE + 1) * CARD_MARGIN * 2) / GRID_SIZE;

const OrderScreen = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCart, setExpandedCart] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedProduct, setScannedProduct] = useState(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: productService.getProducts,
  });

  const filteredProducts = selectedCategory
    ? products?.filter((product) => product.category === selectedCategory)
    : products;

  const addToCart = (product) => {
    // Check if product is in stock
    if (product.stock <= 0) {
      alert(`Sorry, ${product.name} is out of stock.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        const newQuantity = (existing.quantity || 0) + (product.quantity || 1);

        // Check if there's enough stock
        if (newQuantity > product.stock) {
          alert(
            `Sorry, only ${product.stock} units available for ${product.name}.`
          );
          return current.map((item) =>
            item.id === product.id ? { ...item, quantity: product.stock } : item
          );
        }

        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        );
      } else {
        return [...current, { ...product, quantity: product.quantity || 1 }];
      }
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    setCart((current) => {
      const updatedCart =
        newQuantity <= 0
          ? current.filter((item) => item.id !== productId)
          : current.map((item) =>
              item.id === productId ? { ...item, quantity: newQuantity } : item
            );
      return updatedCart;
    });
  };

  const handleBarCodeScanned = ({ data }) => {
    const product = products?.find((p) => p.barcode === data);
    if (product) {
      setScannedProduct({ ...product, quantity: 1 });
    } else {
      alert("Product not found");
      setScanning(false);
    }
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      await requestPermission();
      if (!permission?.granted) {
        alert("Sorry, we need camera permissions to scan barcodes");
        return;
      }
    }
    setScanning(true);
  };

  const handleAddScannedProduct = () => {
    if (scannedProduct) {
      addToCart({
        ...scannedProduct,
        quantity: scannedProduct.quantity,
      });
      setScannedProduct(null);
      setScanning(true); // Restart scanning after adding the product
    }
  };

  const handleCheckoutComplete = (success) => {
    if (success) {
      setCart([]);
      queryClient.invalidateQueries(["products"]);
    }
    setCheckoutVisible(false);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const renderProductCard = ({ item }) => {
    const isOutOfStock = item.stock <= 0;
    const isLowStock = item.stock > 0 && item.stock <= 5;

    return (
      <TouchableRipple
        onPress={() =>
          isOutOfStock ? null : addToCart({ ...item, quantity: 1 })
        }
        borderless
        style={{
          borderRadius: 16,
          opacity: isOutOfStock ? 0.6 : 1,
        }}
        disabled={isOutOfStock}
      >
        <Surface
          style={[styles.productCard, { width: CARD_WIDTH }]}
          elevation={2}
        >
          <View style={styles.productContent}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.category && (
              <Text style={styles.productCategory}>{item.category}</Text>
            )}

            {/* Stock display */}
            <View style={styles.productStockInfo}>
              <Text
                style={[
                  styles.stockText,
                  isOutOfStock
                    ? styles.outOfStockText
                    : isLowStock
                    ? styles.lowStockText
                    : null,
                ]}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : isLowStock
                  ? `Low Stock: ${item.stock}`
                  : `Stock: ${item.stock}`}
              </Text>
            </View>

            <View style={styles.priceActionContainer}>
              <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
              <IconButton
                icon="plus"
                mode="contained"
                size={16}
                onPress={() =>
                  isOutOfStock ? null : addToCart({ ...item, quantity: 1 })
                }
                style={styles.addButtonIcon}
                disabled={isOutOfStock}
              />
            </View>
          </View>
        </Surface>
      </TouchableRipple>
    );
  };

  const renderCartItem = ({ item }) => (
    <Surface style={styles.cartItemSurface} elevation={1}>
      <View style={styles.cartItem}>
        <View style={styles.cartItemDetails}>
          <Text style={styles.cartItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cartItemPrice}>
            ₱{(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
        <View style={styles.cartActions}>
          <IconButton
            icon="minus"
            size={20}
            mode="outlined"
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            style={styles.quantityButton}
          />
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <IconButton
            icon="plus"
            size={20}
            mode="outlined"
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            style={styles.quantityButton}
          />
        </View>
      </View>
    </Surface>
  );

  const renderCategoryChip = (category, index) => (
    <Chip
      key={`category-${index}`}
      selected={selectedCategory === category}
      onPress={() => setSelectedCategory(category)}
      style={styles.categoryChip}
      mode="outlined"
    >
      {category}
    </Chip>
  );

  if (scanning) {
    return (
      <Portal>
        <Modal
          visible={true}
          onDismiss={() => {
            setScanning(false);
            setScannedProduct(null);
          }}
          contentContainerStyle={styles.scannerContainer}
        >
          {scannedProduct ? (
            <Surface style={styles.scannedProductContainer}>
              <Text style={styles.scannedProductTitle}>Scanned Product</Text>
              <Text style={styles.scannedProductName}>
                {scannedProduct.name}
              </Text>
              <Text style={styles.scannedProductPrice}>
                ₱{scannedProduct.price.toFixed(2)}
              </Text>
              <View style={styles.quantityContainer}>
                <IconButton
                  icon="minus"
                  mode="outlined"
                  size={20}
                  onPress={() =>
                    setScannedProduct((prev) => ({
                      ...prev,
                      quantity: Math.max(1, prev.quantity - 1),
                    }))
                  }
                />
                <Text style={styles.quantityText}>
                  {scannedProduct.quantity}
                </Text>
                <IconButton
                  icon="plus"
                  mode="outlined"
                  size={20}
                  onPress={() =>
                    setScannedProduct((prev) => ({
                      ...prev,
                      quantity: prev.quantity + 1,
                    }))
                  }
                />
              </View>
              <View style={styles.scannedProductActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setScannedProduct(null);
                    setScanning(false);
                  }}
                  style={styles.actionButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddScannedProduct}
                  style={styles.actionButton}
                >
                  Add to Order
                </Button>
              </View>
            </Surface>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "code128"],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <Button
                  mode="contained"
                  onPress={() => setScanning(false)}
                  style={styles.cancelScanButton}
                >
                  Cancel Scan
                </Button>
              </View>
            </CameraView>
          )}
        </Modal>
      </Portal>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Title with Scan Button */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Order Screen</Text>
        <View style={styles.headerActions}>
          <IconButton icon="barcode-scan" size={24} onPress={startScanning} />
          {totalItems > 0 && (
            <Badge size={24} style={styles.orderBadge}>
              {totalItems}
            </Badge>
          )}
        </View>
      </View>

      {/* Category Filters */}
      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <View style={styles.categoriesContent}>
            <Chip
              key="category-all"
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
              style={styles.categoryChip}
              mode="outlined"
            >
              All
            </Chip>
            {categories.map((category, index) =>
              renderCategoryChip(category, index)
            )}
          </View>
        </View>
      )}

      {/* Product Grid */}
      <View style={styles.productsContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Error loading products: {error.message}
            </Text>
            <Button
              mode="contained"
              onPress={() => refetch()}
              style={{ marginTop: 16 }}
            >
              Retry
            </Button>
          </View>
        ) : !filteredProducts || filteredProducts.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {selectedCategory
                ? `No ${selectedCategory} products available.`
                : "No products available."}
            </Text>
            {selectedCategory && (
              <Button
                mode="outlined"
                onPress={() => setSelectedCategory(null)}
                style={{ marginTop: 16 }}
              >
                Show All Products
              </Button>
            )}
          </View>
        ) : (
          <FlashList
            data={filteredProducts}
            renderItem={renderProductCard}
            numColumns={GRID_SIZE}
            estimatedItemSize={150}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.productListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Cart Panel */}
      <Surface
        style={[styles.cartContainer, { height: expandedCart ? "60%" : 60 }]}
        elevation={4}
      >
        <TouchableRipple
          onPress={() => setExpandedCart(!expandedCart)}
          style={styles.cartHeader}
        >
          <View style={styles.cartHeaderContent}>
            <View style={styles.cartTitleContainer}>
              <Text style={styles.cartTitle}>Order</Text>
              {totalItems > 0 && (
                <Badge size={24} style={styles.orderBadge}>
                  {totalItems}
                </Badge>
              )}
            </View>
            <IconButton
              icon={expandedCart ? "chevron-down" : "chevron-up"}
              size={24}
            />
          </View>
        </TouchableRipple>

        {expandedCart && (
          <>
            <Divider style={styles.divider} />
            {cart.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Text style={styles.emptyCartSubtext}>
                  Add items from the menu above
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.cartListContainer}>
                  <FlashList
                    data={cart}
                    renderItem={renderCartItem}
                    estimatedItemSize={80}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.cartListContent}
                  />
                </View>
                <Surface style={styles.checkoutContainer} elevation={0}>
                  <Divider style={styles.divider} />
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
                  </View>
                  <Button
                    mode="contained"
                    disabled={cart.length === 0}
                    style={styles.checkoutButton}
                    contentStyle={styles.checkoutButtonContent}
                    onPress={() => setCheckoutVisible(true)}
                  >
                    Proceed to Checkout
                  </Button>
                </Surface>
              </>
            )}
          </>
        )}
      </Surface>
      <CheckoutModal
        visible={checkoutVisible}
        onDismiss={handleCheckoutComplete}
        cart={cart}
        total={total}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  orderBadge: {
    marginLeft: 8,
  },
  categoriesContainer: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  categoriesContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  productsContainer: {
    flex: 2,
    padding: CARD_MARGIN,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  productListContent: {
    paddingBottom: 16,
  },
  productCard: {
    margin: CARD_MARGIN,
    borderRadius: 16,
    overflow: "hidden",
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.7,
  },
  priceActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  addButtonIcon: {
    margin: 0,
  },
  cartContainer: {
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  cartHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cartHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 4,
  },
  emptyCartSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  cartListContainer: {
    flex: 1,
  },
  cartListContent: {
    paddingHorizontal: 16,
  },
  cartItemSurface: {
    marginVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "bold",
  },
  cartActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    margin: 0,
  },
  quantityText: {
    fontSize: 16,
    minWidth: 30,
    textAlign: "center",
    fontWeight: "500",
  },
  checkoutContainer: {
    padding: 16,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  checkoutButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  checkoutButtonContent: {
    paddingVertical: 6,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 16,
  },
  divider: {
    marginVertical: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scannerContainer: {
    flex: 1,
    margin: 0,
    backgroundColor: "black",
  },
  camera: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 50,
  },
  cancelScanButton: {
    marginBottom: 20,
    backgroundColor: "white",
    backgroundColor: "",
  },
  scannedProductContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "white",
  },
  scannedProductTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  scannedProductName: {
    fontSize: 18,
    marginBottom: 8,
  },
  scannedProductPrice: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2e7d32",
    marginBottom: 16,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  scannedProductActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  productStockInfo: {
    marginTop: 4,
    marginBottom: 2,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "500",
  },
  lowStockText: {
    color: "#FF9800", // Orange for low stock
  },
  outOfStockText: {
    color: "#D32F2F", // Red for out of stock
  },
});

export default OrderScreen;
