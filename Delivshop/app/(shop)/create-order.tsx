import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi, DeliveryAvailabilityResponse } from '@/services/api/shopApi';
import { Product } from '@/types/product';
import { CacheManager } from '@/services/offline/cacheManager';
import { OrderQueueManager, PendingOrderItem } from '@/services/offline/orderQueue';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function CreateOrderScreen() {
  const { user, shop } = useAuth();
  const currentShopId = shop?.id || user?.shopId || 'current';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Delivery Availability State
  const [availability, setAvailability] = useState<DeliveryAvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Delivery address from profile
  const deliveryAddress = useMemo(() => ({
    street: shop?.address || 'H.NO.5192,P.NO.08, Ozar',
    city: shop?.city || 'Nashik',
    postalCode: shop?.pincode || '422206',
    notes: 'Please verify milk crate count on arrival',
  }), [shop]);


  // Load products (cache-first + network update)
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      // 1. Try cache
      const cached = await CacheManager.load<Product[]>(currentShopId, 'products');
      if (cached.data && isMounted) {
        setProducts(cached.data);
        setLoading(false);
      }

      // 2. Fetch fresh products from backend
      try {
        const fresh = await shopApi.getMyProducts();
        if (isMounted && Array.isArray(fresh)) {
          setProducts(fresh);
          await CacheManager.save(currentShopId, 'products', fresh);
        }
      } catch {
        // Retain cached catalog
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProducts();
    return () => { isMounted = false; };
  }, [currentShopId]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Quantity helpers
  const handleQuantityChange = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Cart summary calculations
  const cartItems: PendingOrderItem[] = useMemo(() => {
    const list: PendingOrderItem[] = [];
    for (const [pId, qty] of Object.entries(cart)) {
      if (qty > 0) {
        const p = products.find((prod) => prod.id === pId);
        if (p) {
          const unitPrice = Number(p.price);
          list.push({
            productId: pId,
            name: p.name,
            quantity: qty,
            unitPrice,
            totalPrice: unitPrice * qty,
          });
        }
      }
    }
    return list;
  }, [cart, products]);

  const totalQuantity = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryFee = 0;
  const orderTotal = subtotal + deliveryFee;

  // Check general service status whenever the review modal opens
  useEffect(() => {
    if (!reviewModalVisible) return;
    let isMounted = true;

    async function checkAvailability() {
      setLoadingAvailability(true);
      try {
        const estCrates = Math.max(1, Math.ceil(totalQuantity / 12));
        const avail = await shopApi.getDeliveryAvailability(estCrates);
        if (!isMounted) return;
        setAvailability(avail);
      } catch (e) {
        console.warn('Availability check notice', e);
      } finally {
        if (isMounted) setLoadingAvailability(false);
      }
    }

    checkAvailability();
    return () => { isMounted = false; };
  }, [reviewModalVisible, totalQuantity]);

  // Order submission with Idempotency Key & Offline queue
  // Shop role NEVER controls delivery dates: date assignment is strictly performed by Admin operations
  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add at least one dairy item to your order.');
      return;
    }

    setSubmitting(true);

    // 1. Create a persistent offline queue record with client-generated idempotency key
    const pendingOrder = await OrderQueueManager.createPendingOrder(
      currentShopId,
      cartItems,
      deliveryAddress,
      subtotal,
      orderTotal
    );

    // 2. Dispatch to backend API with Idempotency-Key
    try {
      const result = await shopApi.createOrder(
        {
          items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          deliveryAddress,
        },
        pendingOrder.idempotencyKey
      );

      // Successfully acknowledged by server
      await OrderQueueManager.updateOrderStatus(currentShopId, pendingOrder.localId, 'CONFIRMED', {
        serverOrderNumber: (result as any).order_number,
      });

      setSuccessOrder(result);
      setCart({});
      setReviewModalVisible(false);
    } catch (err: any) {
      // Network drop or timeout: order remains safely queued in local storage
      const errorMsg = err?.message || 'Connection interrupted. Saved locally in offline queue.';
      await OrderQueueManager.updateOrderStatus(currentShopId, pendingOrder.localId, 'PENDING_SYNC', {
        errorMessage: errorMsg,
      });

      Alert.alert(
        'Order Saved Locally',
        'Your replenishment order has been saved securely on this device and will automatically sync once your connection stabilizes.\n\nIdempotency Key: ' +
          pendingOrder.idempotencyKey.slice(0, 16) +
          '...',
        [
          {
            text: 'OK',
            onPress: () => {
              setCart({});
              setReviewModalVisible(false);
              router.push('/(shop)/orders');
            },
          },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#123B32" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Place New Order</Text>
          <Text style={styles.headerSubtitle}>Direct Supplier Dairy Replenishment</Text>
        </View>
        <TouchableOpacity
          onPress={() => cartItems.length > 0 && setReviewModalVisible(true)}
          style={styles.cartBadgeButton}
        >
          <Ionicons name="cart" size={22} color="#16805D" />
          {totalQuantity > 0 && (
            <View style={styles.cartCountPill}>
              <Text style={styles.cartCountText}>{totalQuantity}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search milk, paneer, curd, ghee..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product List */}
      <ScrollView contentContainerStyle={styles.productList} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#16805D" />
            <Text style={styles.loadingText}>Loading dairy catalog...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query or selected category.</Text>
          </View>
        ) : (
          filteredProducts.map((product) => {
            const qty = cart[product.id] || 0;
            const price = Number(product.price || 0);

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <View style={styles.productHeaderRow}>
                    <Text style={styles.productCategoryTag}>{product.category || 'Dairy'}</Text>
                    <Text style={styles.productSkuText}>SKU: {product.sku}</Text>
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.description ? (
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {product.description}
                    </Text>
                  ) : null}
                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>{formatCurrency(price)}</Text>
                    <Text style={styles.unitText}>
                      / {(product as any).selling_unit || (product as any).sellingUnit || (product as any).base_unit || (product as any).baseUnit || product.unit_of_measure || product.unit || 'item'}
                    </Text>
                    {product.pack_size || (product as any).packSize ? (
                      <Text style={styles.packSizeText}>• {product.pack_size || (product as any).packSize}</Text>
                    ) : (
                      <Text style={styles.packSizeText}>• Direct Supply</Text>
                    )}
                  </View>
                </View>

                {/* Quantity Controls */}
                <View style={styles.quantityControls}>
                  {qty === 0 ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleQuantityChange(product.id, 1)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.stepperBox}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleQuantityChange(product.id, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#16805D" />
                      </TouchableOpacity>
                      <Text style={styles.stepQtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleQuantityChange(product.id, 1)}
                      >
                        <Ionicons name="add" size={16} color="#16805D" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <View style={styles.floatingCartBar}>
          <View>
            <Text style={styles.cartBarUnits}>{totalQuantity} Units Selected</Text>
            <Text style={styles.cartBarTotal}>{formatCurrency(orderTotal)}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => setReviewModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartBarBtnText}>Review & Place Order →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Review Bottom Sheet / Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Confirmation Summary</Text>
              <TouchableOpacity onPress={() => !submitting && setReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.storeAddressBox}>
                <Ionicons name="location-outline" size={18} color="#16805D" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryToLabel}>Delivery To Registered Facility</Text>
                  <Text style={styles.storeAddressText}>{deliveryAddress.street}, {deliveryAddress.city}</Text>
                  <Text style={styles.storePincodeText}>PIN: {deliveryAddress.postalCode}</Text>
                </View>
              </View>

              {/* Delivery Scheduling Notice */}
              <View style={styles.schedulingSection}>
                <View style={styles.unscheduledNoticeRow}>
                  <Ionicons name="information-circle-outline" size={20} color="#16805D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unscheduledTitle}>Logistics Delivery Scheduling</Text>
                    <Text style={styles.unscheduledMsg}>
                      Your order will be scheduled and confirmed by our supplier logistics team upon submission.
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.summarySectionTitle}>Line Items ({cartItems.length})</Text>

              {cartItems.map((item) => (
                <View key={item.productId} style={styles.summaryItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemName}>{item.name}</Text>
                    <Text style={styles.summaryItemSub}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.summaryItemTotal}>{formatCurrency(item.totalPrice)}</Text>
                </View>
              ))}

              <View style={styles.billDivider} />

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Subtotal</Text>
                <Text style={styles.billValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Route Delivery Logistics</Text>
                <Text style={[styles.billValue, { color: '#16805D' }]}>FREE (Included)</Text>
              </View>
              <View style={[styles.billRow, { marginTop: 6 }]}>
                <Text style={styles.billTotalLabel}>Total Payable Amount</Text>
                <Text style={styles.billTotalValue}>{formatCurrency(orderTotal)}</Text>
              </View>

              <View style={styles.idempotencyNotice}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#16805D" />
                <Text style={styles.idempotencyNoticeText}>
                  Protected by cryptographic idempotency key to prevent accidental duplicate orders on slow internet.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.confirmOrderBtn, submitting && styles.confirmOrderBtnDisabled]}
                onPress={handleConfirmOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmOrderBtnText}>Transmitting to Logistics Hub...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmOrderBtnText}>
                    Confirm & Transmit Order ({formatCurrency(orderTotal)})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      {successOrder && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { padding: 24, alignItems: 'center' }]}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successSubtitle}>
                Official Order Reference:
              </Text>
              <View style={styles.orderNumberBadge}>
                <Text style={styles.orderNumberBadgeText}>
                  {successOrder.order_number || `ORD-${successOrder.id?.slice(0, 8)}`}
                </Text>
              </View>

              {/* Delivery Schedule Status Notice */}
              <View style={styles.successUnscheduledBox}>
                <View style={styles.successStatusRow}>
                  <Ionicons name="time" size={18} color="#D97706" />
                  <Text style={styles.successStatusUnscheduledTitle}>Order Placed (Pending Schedule)</Text>
                </View>
                <Text style={styles.successUnscheduledMsg}>
                  Your replenishment order has been registered. The delivery schedule will be confirmed by supplier logistics.
                </Text>
              </View>

              <Text style={styles.successNotes}>
                Your replenishment order has been registered in the supplier dispatches ledger.
              </Text>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setSuccessOrder(null);
                  router.push('/(shop)/orders');
                }}
              >
                <Text style={styles.doneBtnText}>View In Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#123B32',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  cartBadgeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F2',
    position: 'relative',
  },
  cartCountPill: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8F8F2',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#20342C',
    height: '100%',
  },
  categoriesWrapper: {
    backgroundColor: '#F8F8F2',
    paddingBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#123B32',
    borderColor: '#123B32',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#F8F8F2',
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20342C',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productInfo: {
    flex: 1,
    paddingRight: 12,
  },
  productHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productCategoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productSkuText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20342C',
    marginBottom: 3,
  },
  productDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#123B32',
  },
  unitText: {
    fontSize: 11,
    color: '#64748B',
  },
  packSizeText: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 4,
  },
  quantityControls: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16805D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F2',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
    minWidth: 24,
    textAlign: 'center',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#123B32',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#123B32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cartBarUnits: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  cartBarTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cartBarBtn: {
    backgroundColor: '#16805D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cartBarBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 59, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#123B32',
  },
  modalScroll: {
    padding: 16,
  },
  storeAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8F8F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  deliveryToLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16805D',
    marginBottom: 2,
  },
  storeAddressText: {
    fontSize: 12,
    color: '#20342C',
    fontWeight: '500',
  },
  storePincodeText: {
    fontSize: 11,
    color: '#64748B',
  },
  summarySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
    marginBottom: 10,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#20342C',
  },
  summaryItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#123B32',
  },
  billTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16805D',
  },
  idempotencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 16,
  },
  idempotencyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmOrderBtn: {
    backgroundColor: '#16805D',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOrderBtnDisabled: {
    opacity: 0.7,
  },
  confirmOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16805D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123B32',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  orderNumberBadge: {
    backgroundColor: '#F8F8F2',
    borderWidth: 1,
    borderColor: '#C7A75A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  orderNumberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#123B32',
    letterSpacing: 0.5,
  },
  successNotes: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: '#123B32',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  schedulingSection: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  schedulingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  schedulingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#123B32',
  },
  availLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  availLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  coverageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  coverageBannerWarn: {
    backgroundColor: '#FFFBEB',
  },
  coverageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  coverageTextWarn: {
    color: '#92400E',
  },
  runsContainer: {
    gap: 8,
    marginTop: 4,
  },
  runsPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateCardActive: {
    borderColor: '#16805D',
    backgroundColor: '#F0FDF4',
  },
  dateCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dateTextActive: {
    color: '#16805D',
  },
  windowText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  guaranteedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guaranteedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
  },
  dateCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  capacityText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#16805D',
  },
  radioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16805D',
  },
  customDateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  customDateToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16805D',
    textDecorationLine: 'underline',
  },
  unscheduledBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  unscheduledNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  unscheduledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  unscheduledMsg: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  customDateInputSection: {
    marginTop: 6,
  },
  customDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 4,
  },
  customDateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#1E293B',
  },
  backToRunsBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  backToRunsBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16805D',
  },
  policyWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  policyWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  successScheduledBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 14,
    alignItems: 'center',
  },
  successStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  successStatusScheduledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  successScheduledDate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16805D',
    marginVertical: 2,
  },
  successScheduledWindow: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  successScheduledSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  successUnscheduledBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 14,
  },
  successStatusUnscheduledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  successUnscheduledMsg: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  successRequestedDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
});
