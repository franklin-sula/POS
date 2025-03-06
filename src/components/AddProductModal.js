import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  Modal,
  Portal,
  Button,
  Text,
  IconButton,
  useTheme,
} from "react-native-paper";
import { TextInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CameraView, useCameraPermissions } from "expo-camera";

// Update schema to include barcodes
const productSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number"),
  stock: z
    .string()
    .min(1, "Stock is required")
    .refine((val) => !isNaN(parseInt(val)), "Must be a valid number"),
});

const AddProductModal = ({ visible, onDismiss, onSubmit }) => {
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const theme = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      barcode: "",
      name: "",
      price: "",
      stock: "",
    },
  });

  const handleBarCodeScanned = ({ data }) => {
    setValue("barcode", data);
    setScanning(false);
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

  if (scanning) {
    return (
      <Portal>
        <Modal
          visible={true}
          onDismiss={() => setScanning(false)}
          contentContainerStyle={styles.scannerContainer}
        >
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
                labelStyle={{ color: theme.colors.primary }}
              >
                Cancel Scan
              </Button>
            </View>
          </CameraView>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>Add New Product</Text>

        <View style={styles.barcodeContainer}>
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Barcode (optional)"
                value={value}
                onChangeText={onChange}
                style={[styles.input, styles.barcodeInput]}
                error={!!errors.barcode}
              />
            )}
          />
          <IconButton
            icon="barcode-scan"
            size={24}
            onPress={startScanning}
            style={styles.scanButton}
          />
        </View>
        {errors.barcode && (
          <Text style={styles.errorText}>{errors.barcode.message}</Text>
        )}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Product Name"
              value={value}
              onChangeText={onChange}
              style={styles.input}
              error={!!errors.name}
            />
          )}
        />
        {errors.name && (
          <Text style={styles.errorText}>{errors.name.message}</Text>
        )}

        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Price"
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              style={styles.input}
              error={!!errors.price}
            />
          )}
        />
        {errors.price && (
          <Text style={styles.errorText}>{errors.price.message}</Text>
        )}

        <Controller
          control={control}
          name="stock"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Stock"
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
              style={styles.input}
              error={!!errors.stock}
            />
          )}
        />
        {errors.stock && (
          <Text style={styles.errorText}>{errors.stock.message}</Text>
        )}

        <View style={styles.buttons}>
          <Button
            onPress={() => {
              reset();
              onDismiss();
            }}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit((data) => {
              onSubmit({
                barcode: data.barcode,
                name: data.name,
                price: parseFloat(data.price),
                stock: parseInt(data.stock),
              });
              reset();
            })}
            style={styles.button}
          >
            Add Product
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
  input: {
    marginBottom: 4,
  },
  errorText: {
    color: "#B00020",
    fontSize: 12,
    marginBottom: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  button: {
    marginLeft: 10,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  barcodeInput: {
    flex: 1,
    marginRight: 8,
  },
  scanButton: {
    margin: 0,
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
  cancelScanButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "white",
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 50,
  },
});

export default AddProductModal;
