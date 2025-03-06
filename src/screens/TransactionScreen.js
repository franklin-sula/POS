import React, { useEffect, useState } from "react";
import { View, StyleSheet, RefreshControl, ScrollView } from "react-native";
import {
  Text,
  Surface,
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  useTheme,
  Portal,
  Modal,
} from "react-native-paper";
import { FlashList } from "@shopify/flash-list";
import { supabase } from "../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper function to format dates with proper timezone handling
const formatDate = (dateString) => {
  try {
    if (!dateString) return "Unknown date";

    // Create date object - this will be in local timezone
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    // Use the Asia/Manila timezone for formatting
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    };

    return new Intl.DateTimeFormat("en-PH", options).format(date);
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString || "Unknown date";
  }
};

// Helper function for compact date display in list items
const formatCompactDate = (dateString) => {
  try {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    }).format(date);
  } catch (error) {
    console.error("Compact date formatting error:", error);
    return "";
  }
};

const TransactionsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionItems, setTransactionItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create dynamic styles that depend on theme
  const dynamicStyles = {
    modalHeaderBar: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      elevation: 4,
    },
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactionItems = async (transactionId) => {
    try {
      setLoadingItems(true);

      const { data, error } = await supabase
        .from("transaction_items")
        .select(
          `
          *,
          product:products(name)
        `
        )
        .eq("transaction_id", transactionId);

      if (error) throw error;

      setTransactionItems(data || []);
      setModalVisible(true);
    } catch (err) {
      console.error("Error fetching transaction items:", err);
      alert("Error fetching transaction details: " + err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    fetchTransactionItems(transaction.id);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const renderTransactionItem = ({ item }) => {
    const formattedDate = formatCompactDate(item.created_at);

    return (
      <Surface style={styles.transactionItem} elevation={1}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionId}>#{item.id.slice(0, 8)}</Text>
          <Text style={styles.transactionDate}>{formattedDate}</Text>
        </View>

        <View style={styles.transactionDetails}>
          <View>
            <Text style={styles.transactionLabel}>Total</Text>
            <Text style={styles.transactionAmount}>
              ₱{item.total.toFixed(2)}
            </Text>
          </View>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => handleTransactionPress(item)}
          />
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Error: {error}
          </Text>
          <Button
            mode="contained"
            onPress={fetchTransactions}
            style={{ marginTop: 16 }}
          >
            Retry
          </Button>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      ) : (
        <FlashList
          data={transactions}
          renderItem={renderTransactionItem}
          estimatedItemSize={100}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { maxHeight: "95%" }]}
        >
          {selectedTransaction && (
            <>
              {/* Header Bar */}
              <Surface style={dynamicStyles.modalHeaderBar} elevation={1}>
                <View style={styles.modalHeaderContent}>
                  <View>
                    <Text style={styles.receiptNumberLabel}>
                      Transaction ID
                    </Text>
                    <Text style={styles.receiptNumber}>
                      #{selectedTransaction.id}
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={24}
                    onPress={() => setModalVisible(false)}
                    style={styles.closeIcon}
                  />
                </View>
              </Surface>

              {/* Receipt Content */}
              <ScrollView style={styles.receiptScrollView}>
                {/* Date and Time */}
                <View style={styles.receiptDateContainer}>
                  <IconButton
                    icon="calendar"
                    size={20}
                    style={styles.calendarIcon}
                  />
                  <Text style={styles.receiptDate}>
                    {formatDate(selectedTransaction.created_at)}
                  </Text>
                </View>
                {/* Items Section */}
                <Text style={styles.sectionTitle}>Purchased Items</Text>
                {loadingItems ? (
                  <View style={styles.loadingItemsContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                    <Text>Loading items...</Text>
                  </View>
                ) : (
                  <Surface style={styles.itemsContainerSurface} elevation={2}>
                    {transactionItems.map((item, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <Divider />}
                        <View style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>
                              {item.product?.name || "Unknown Product"}
                            </Text>
                            <View style={styles.priceQuantityContainer}>
                              <Text style={styles.itemPrice}>
                                ₱{item.price.toFixed(2)}
                              </Text>
                              <Text style={styles.itemQuantity}>
                                × {item.quantity}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.itemSubtotal}>
                            ₱{(item.quantity * item.price).toFixed(2)}
                          </Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </Surface>
                )}
                {/* Payment Summary */}
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <Surface style={styles.paymentInfoSurface} elevation={2}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Total Amount:</Text>
                    <Text style={styles.paymentValue}>
                      ₱{selectedTransaction.total.toFixed(2)}
                    </Text>
                  </View>
                  <Divider style={styles.paymentDivider} />
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Cash Received:</Text>
                    <Text style={styles.paymentValue}>
                      ₱{selectedTransaction.cash_given.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.paymentRow, styles.changeRow]}>
                    <Text style={styles.changeLabel}>Change:</Text>
                    <Text style={styles.changeValue}>
                      ₱{selectedTransaction.change.toFixed(2)}
                    </Text>
                  </View>
                </Surface>
              </ScrollView>

              {/* Bottom Action */}
              <Button
                mode="contained"
                icon="receipt"
                onPress={() => setModalVisible(false)}
                style={styles.printButton}
                labelStyle={styles.printButtonLabel}
              >
                Close Receipt
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8, // Add this to create spacing where search was
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8, // Add some padding at the top of the list
  },
  transactionItem: {
    borderRadius: 8,
    marginVertical: 6,
    overflow: "hidden",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  transactionId: {
    fontWeight: "700",
  },
  transactionDate: {
    opacity: 0.7,
  },
  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  transactionLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalContainer: {
    backgroundColor: "#f5f5f5",
    margin: 20,
    borderRadius: 16,
    maxHeight: "95%", // Increased from 85% to 95%
    width: "90%",
    alignSelf: "center",
    overflow: "hidden",
    paddingBottom: 0, // Remove bottom padding to eliminate white space
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalId: {
    fontSize: 16,
    opacity: 0.7,
    fontWeight: "500",
  },
  modalDate: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 8,
  },
  loadingItemsContainer: {
    padding: 20,
    alignItems: "center",
  },
  itemsContainer: {
    maxHeight: 250, // Increased for better visibility
  },
  itemsContainerSurface: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    flexShrink: 1,
  },
  itemQuantity: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 8,
    fontWeight: "500",
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 16,
  },
  paymentInfo: {
    marginTop: 8,
  },
  paymentInfoSurface: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 15,
    color: "#666",
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  changeValue: {
    color: "#2E7D32", // Green color for change
  },
  closeButton: {
    marginTop: 20,
    borderRadius: 8,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptNumberLabel: {
    color: "white",
    opacity: 0.8,
    fontSize: 14,
  },
  receiptNumber: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeIcon: {
    margin: 0,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  receiptScrollView: {
    padding: 16,
  },
  receiptDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarIcon: {
    margin: 0,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  receiptDate: {
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  priceQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 14,
    opacity: 0.7,
  },
  paymentDivider: {
    marginVertical: 10,
  },
  changeRow: {
    marginTop: 4,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionIdContainer: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIdLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  transactionIdValue: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  printButton: {
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  printButtonLabel: {
    fontSize: 16,
    paddingVertical: 2,
  },
  // Add this to your styles
  headerTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  receiptNumberLabel: {
    color: "white",
    opacity: 0.8,
    fontSize: 14,
  },
  receiptNumber: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    // Allow text to be truncated with ellipsis
    width: "100%",
  },
});

export default TransactionsScreen;
