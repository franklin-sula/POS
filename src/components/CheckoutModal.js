import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Surface,
  Button,
  Divider,
  ActivityIndicator,
  TextInput,
  useTheme,
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import { productService } from "../services/productService";

const formatDate = (dateString) => {
  try {
    // If no date provided, use current date
    if (!dateString) {
      return new Date().toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });
    }

    // Create date object from string
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return new Date().toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });
    }

    // Format with Philippines timezone
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila", // Force Philippine timezone
    }).format(date);
  } catch (error) {
    console.error("Date formatting error:", error);
    return new Date().toLocaleString("en-PH");
  }
};

const CheckoutModal = ({ visible, onDismiss, cart, total }) => {
  const theme = useTheme();
  const [cashGiven, setCashGiven] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  const change = cashGiven ? parseFloat(cashGiven) - total : 0;
  const isValidPayment = cashGiven && parseFloat(cashGiven) >= total;

  const handleSubmitTransaction = async () => {
    try {
      setProcessing(true);
      setError(null);

      // First check if there's enough stock for all items
      const stockCheck = await productService.checkStockAvailability(cart);
      if (!stockCheck.success) {
        setError(
          `Some items are out of stock: ${stockCheck.insufficientItems
            .map(
              (item) =>
                `${item.name} (requested: ${item.requested}, available: ${item.available})`
            )
            .join(", ")}`
        );
        setProcessing(false);
        return;
      }

      // Step 1: Create the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          total: total,
          cash_given: parseFloat(cashGiven),
          change: change,
          status: "completed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Step 2: Create transaction items
      const transactionItems = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Step 3: Update product stock levels
      await productService.deductStockAfterCheckout(cart);

      // Step 4: Generate receipt
      setReceipt({
        ...transaction,
        items: cart.map((item) => ({
          ...item,
          subtotal: item.price * item.quantity,
        })),
      });

      setTimeout(() => {
        setProcessing(false);
      }, 1000);
    } catch (error) {
      console.error("Checkout error:", error);
      setError(error.message || "An error occurred during checkout");
      setProcessing(false);
    }
  };

  const handleCashInputChange = (text) => {
    // Only allow numbers with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(text)) {
      setCashGiven(text);
    }
  };

  const handleDone = () => {
    setReceipt(null);
    setCashGiven("");
    onDismiss(true);
  };

  if (processing) {
    return (
      <Portal>
        <Modal visible={visible} contentContainerStyle={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing transaction...</Text>
          </View>
        </Modal>
      </Portal>
    );
  }

  if (receipt) {
    return (
      <Portal>
        <Modal visible={visible} contentContainerStyle={styles.container}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Transaction Complete</Text>
              <Text style={styles.receiptId}>
                Receipt #{receipt.id.slice(0, 8)}
              </Text>
            </View>

            <ScrollView
              style={styles.receiptScrollView}
              contentContainerStyle={styles.receiptScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Surface style={styles.receiptSurface} elevation={1}>
                <View style={styles.receiptItemsHeader}>
                  <Text style={styles.receiptItemsTitle}>Items</Text>
                </View>
                <Divider />

                {receipt.items &&
                  receipt.items.map((item, index) => (
                    <View key={index} style={styles.receiptItem}>
                      <View style={styles.receiptItemInfo}>
                        <Text style={styles.receiptItemName}>{item.name}</Text>
                        <Text style={styles.receiptItemQty}>
                          x{item.quantity} @ ₱{item.price.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.receiptItemPrice}>
                        ₱{item.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  ))}

                <Divider style={styles.divider} />

                <View style={styles.receiptPaymentInfo}>
                  <View style={styles.receiptPaymentRow}>
                    <Text style={styles.receiptPaymentLabel}>Total:</Text>
                    <Text style={styles.receiptPaymentValue}>
                      ₱{receipt.total.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.receiptPaymentRow}>
                    <Text style={styles.receiptPaymentLabel}>Cash:</Text>
                    <Text style={styles.receiptPaymentValue}>
                      ₱{receipt.cash_given.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.receiptPaymentRow}>
                    <Text style={styles.receiptPaymentLabel}>Change:</Text>
                    <Text
                      style={[styles.receiptPaymentValue, styles.changeValue]}
                    >
                      ₱{receipt.change.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptFooter}>
                  <Text style={styles.receiptFooterText}>
                    {formatDate(receipt.created_at)}
                  </Text>
                  <Text style={styles.receiptFooterText}>
                    Thank you for your purchase!
                  </Text>
                </View>
              </Surface>
            </ScrollView>

            <Button
              mode="contained"
              onPress={handleDone}
              style={styles.doneButton}
            >
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => onDismiss(false)}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>Checkout</Text>

        {error && (
          <Surface style={styles.errorContainer} elevation={1}>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}

        <ScrollView style={styles.cartSummary}>
          {cart.map((item, index) => (
            <Surface key={index} style={styles.summaryItem} elevation={1}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemMetaContainer}>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  <Text style={styles.itemUnitPrice}>
                    @ ₱{item.price.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemPrice}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </Surface>
          ))}
        </ScrollView>

        <Surface style={styles.paymentContainer} elevation={1}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
          </View>

          <View style={styles.cashInputContainer}>
            <Text style={styles.cashLabel}>Cash Given:</Text>
            <TextInput
              style={styles.cashInput}
              value={cashGiven}
              onChangeText={handleCashInputChange}
              keyboardType="numeric"
              mode="outlined"
              placeholder="0.00"
              right={<TextInput.Affix text="₱" />}
            />
          </View>

          <View style={styles.changeContainer}>
            <Text style={styles.changeLabel}>Change:</Text>
            <Text
              style={[
                styles.changeValue,
                {
                  color: change < 0 ? theme.colors.error : theme.colors.primary,
                },
              ]}
            >
              ₱{isValidPayment ? change.toFixed(2) : "0.00"}
            </Text>
          </View>
        </Surface>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => onDismiss(false)}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmitTransaction}
            style={styles.actionButton}
            disabled={!isValidPayment}
          >
            Complete Sale
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
    borderRadius: 16,
    maxHeight: "100%",
    width: "90%",
    alignSelf: "center",
  },
  checkoutContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 12,
  },
  errorContainer: {
    padding: 10,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
  },
  errorText: {
    color: "#D32F2F",
  },
  cartSummary: {
    maxHeight: 300, // Increased from 200
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16, // Increased from 12
    marginVertical: 6, // Increased from 4
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemMetaContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 14,
    opacity: 0.7,
  },
  itemUnitPrice: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  cashInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cashLabel: {
    fontSize: 16,
    marginRight: 8,
    flex: 2,
  },
  cashInput: {
    flex: 3,
  },
  changeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  changeLabel: {
    fontSize: 18,
    fontWeight: "500",
  },
  changeValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  receiptContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  receiptHeader: {
    marginBottom: 16,
    alignItems: "center",
  },
  receiptScrollView: {
    flex: 1,
  },
  receiptScrollContent: {
    paddingBottom: 8,
  },
  receiptSurface: {
    padding: 16,
    borderRadius: 8,
  },
  receiptItemsHeader: {
    paddingBottom: 8,
  },
  receiptItemsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 12,
  },
  receiptItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 16,
    fontWeight: "500",
  },
  receiptItemQty: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  receiptItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  receiptPaymentInfo: {
    marginTop: 4,
  },
  receiptPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  receiptPaymentLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  receiptPaymentValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  receiptFooter: {
    marginTop: 16,
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  receiptFooterText: {
    fontSize: 14,
    opacity: 0.7,
    marginVertical: 2,
  },
  doneButton: {
    marginTop: 16,
  },
});

export default CheckoutModal;
