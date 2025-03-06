import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  Surface,
  FAB,
  IconButton,
  Menu,
  Snackbar,
  Portal,
  Dialog,
  Button,
} from "react-native-paper";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { productService } from "../services/productService";
import AddProductModal from "../components/AddProductModal";
import EditProductModal from "../components/EditProductModal";
import { useNetInfo } from "@react-native-community/netinfo";

const ProductCard = ({ item, onEdit, onDelete }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const isLowStock = item.stock <= 10;

  return (
    <Surface style={styles.cardContainer} elevation={2}>
      <View style={styles.cardContent}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.rightContent}>
          <Text
            style={[
              styles.stockText,
              { color: isLowStock ? "#F44336" : "#4CAF50" },
            ]}
          >
            {isLowStock ? "Low Stock" : `${item.stock} in stock`}
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                onEdit(item);
              }}
              title="Edit"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                onDelete(item.id);
              }}
              title="Delete"
              titleStyle={{ color: "#F44336" }}
            />
          </Menu>
        </View>
      </View>
    </Surface>
  );
};

const EmptyList = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No products yet</Text>
  </View>
);

const ProductScreen = () => {
  const netInfo = useNetInfo();
  const [modalVisible, setModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productService.getProducts,
  });

  const addProductMutation = useMutation({
    mutationFn: (newProduct) => productService.createProduct(newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setSnackbarMessage("Product added successfully!");
      setSnackbarVisible(true);
      setModalVisible(false);
    },
    onError: (error) => {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
    },
  });

  const editProductMutation = useMutation({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setSnackbarMessage("Product updated successfully!");
      setSnackbarVisible(true);
      setEditModalVisible(false);
      setSelectedProduct(null);
    },
    onError: (error) => {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setSnackbarMessage("Product deleted successfully!");
      setSnackbarVisible(true);
    },
    onError: (error) => {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
    },
  });

  const handleAddProduct = (newProduct) => {
    addProductMutation.mutate(newProduct);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setEditModalVisible(true);
  };

  const handleUpdateProduct = (id, data) => {
    editProductMutation.mutate({ id, data });
  };

  const handleDelete = (id) => {
    setProductToDelete(id);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete);
      setDeleteConfirmVisible(false);
      setProductToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!netInfo.isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are currently offline</Text>
        </View>
      )}
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.listWrapper}>
        <FlashList
          data={products}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={<EmptyList />}
          estimatedItemSize={70}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      />
      <AddProductModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSubmit={handleAddProduct}
      />
      {selectedProduct && (
        <EditProductModal
          visible={editModalVisible}
          onDismiss={() => {
            setEditModalVisible(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleUpdateProduct}
          product={selectedProduct}
        />
      )}
      <Portal>
        <Dialog
          visible={deleteConfirmVisible}
          onDismiss={() => setDeleteConfirmVisible(false)}
        >
          <Dialog.Title>Delete Product</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this product?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmVisible(false)}>
              Cancel
            </Button>
            <Button onPress={confirmDelete} textColor="#F44336">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "Close",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listWrapper: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 50 : 0,
  },
  listContainer: {
    padding: 8,
    paddingBottom: 20,
  },
  cardContainer: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2196F3",
  },
  stockText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  offlineBanner: {
    backgroundColor: "#FFA000",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontWeight: "500",
  },
});

export default ProductScreen;
