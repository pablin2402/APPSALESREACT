import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Animated,
  LayoutAnimation,
  UIManager,
  Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { API_URL } from "../config";
import {
  useSafeAreaInsets,
  SafeAreaView,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";
import { useNavigation } from "@react-navigation/native";
import { COLORS, styles } from "../styles/PaymentScreenStyle";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ShimmerBlock = ({ width, height, style, radius = 8 }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 250],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#e5e7eb",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: 100,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.6)",
          transform: [{ translateX }, { skewX: "-20deg" }],
        }}
      />
    </View>
  );
};

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonTop}>
      <ShimmerBlock width={120} height={18} radius={8} />
      <ShimmerBlock width={80} height={22} radius={6} />
    </View>
    <View style={styles.skeletonMiddle}>
      <ShimmerBlock width={36} height={36} radius={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBlock width={140} height={14} radius={6} />
        <ShimmerBlock width={90} height={11} radius={5} />
      </View>
    </View>
    <View style={styles.skeletonDivider} />
    <ShimmerBlock width={100} height={20} radius={999} />
  </View>
);

const ExpandedReceipt = ({ item, formatDate }) => {
  const image = item.saleImage;

  return (
    <View style={styles.receiptWrap}>
      <View style={styles.receiptDivider} />

      <View style={styles.receiptHeader}>
        <View style={styles.receiptIconBox}>
          <Ionicons name="image" size={14} color={COLORS.brand} />
        </View>
        <Text style={styles.receiptTitle}>
          Comprobante de pago
        </Text>
      </View>

      {image ? (
        <View style={styles.receiptImageContainer}>
          <Image
            source={{ uri: image }}
            style={styles.receiptImage}
            resizeMode="cover"
          />

          <View style={styles.receiptFooter}>
            <Ionicons
              name="time-outline"
              size={11}
              color={COLORS.textLight}
            />
            <Text style={styles.receiptFooterText}>
              Registrado {formatDate(item.creationDate)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noReceiptBox}>
          <Ionicons
            name="image-outline"
            size={28}
            color={COLORS.textLight}
          />
          <Text style={styles.noReceiptText}>
            No hay comprobante disponible
          </Text>
        </View>
      )}
    </View>
  );
};

const PaymentCard = ({ item, isExpanded, onToggle, formatDate, getPaymentStatusStyle }) => {
  const status = getPaymentStatusStyle(item.paymentStatus);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(chevronAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
  }, [isExpanded, chevronAnim]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <TouchableOpacity
      style={[styles.paymentCard, isExpanded && styles.paymentCardActive]}
      activeOpacity={0.95}
      onPress={onToggle}
    >
      <View style={styles.paymentTop}>
        <View style={styles.paymentDateChip}>
          <Ionicons
            name="calendar-outline"
            size={11}
            color={COLORS.textMid}
          />
          <Text style={styles.paymentDateText}>
            {formatDate(item.creationDate)}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.paymentAmount}>
            Bs. {Number(item.total || 0).toFixed(2)}
          </Text>

          {item.paymentStatus === "confirmado" && (
            <View style={styles.confirmedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={12}
                color="#fff"
              />
              <Text style={styles.confirmedBadgeText}>
                Confirmado
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.paymentMiddle}>
        <View style={styles.paymentAvatar}>
          <Text style={styles.paymentAvatarText}>
            {item.orderId?.id_client?.name?.[0]?.toUpperCase()}
            {item.orderId?.id_client?.lastName?.[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.paymentClient} numberOfLines={1}>
            {item.orderId?.id_client?.name}{" "}
            {item.orderId?.id_client?.lastName}
          </Text>
          <Text style={styles.paymentNote}>
            Nota #{item.orderId?.receiveNumber}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDivider} />

      <View style={styles.paymentBottom}>
        <View style={[styles.paymentStatusPill, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={11} color={status.color} />
          <Text style={[styles.paymentStatusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <View style={styles.expandHint}>
          <Text style={styles.expandHintText}>
            {isExpanded ? "Ocultar" : "Ver recibo"}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={14} color={COLORS.brand} />
          </Animated.View>
        </View>
      </View>

      {isExpanded && <ExpandedReceipt item={item} formatDate={formatDate} />}
    </TouchableOpacity>
  );
};

export default function PaymentScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  function utcToLocalDateString(utcDateStr, timeZone = "America/La_Paz") {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(utcDateStr);
  }

  const fetchProducts = async (pageNum = page) => {
    setLoading(true);
    try {
      const payload = {
        id_owner: idOwner,
        sales_id: salesId,
        limit: 8,
        page: pageNum,
        clientName: searchTerm,
      };
      if (startDate && endDate) {
        payload.startDate = utcToLocalDateString(startDate);
        payload.endDate = utcToLocalDateString(endDate);
      }
      const response = await axios.post(
        API_URL + "/whatsapp/order/pay/sales/id",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSalesData(response.data.data || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  };

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return {
          bg: COLORS.infoBg,
          color: COLORS.info,
          label: "INGRESADO",
          icon: "receipt-outline",
        };
      case "confirmado":
        return {
          bg: COLORS.successBg,
          color: COLORS.success,
          label: "APROBADO",
          icon: "checkmark-circle",
        };
      case "rechazado":
        return {
          bg: COLORS.dangerBg,
          color: COLORS.danger,
          label: "RECHAZADO",
          icon: "close-circle",
        };
      default:
        return {
          bg: COLORS.borderLight,
          color: COLORS.textMid,
          label: "DESCONOCIDO",
          icon: "help-circle",
        };
    }
  };

  const totalPagos = salesData.length;
  const totalMonto = salesData.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const pagosAprobados = salesData.filter(
    (p) => p.paymentStatus === "confirmado"
  ).length;

  const hasFilters = startDate || endDate || searchTerm;

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchTerm("");
    setTimeout(() => fetchProducts(1), 100);
  };

  const handleToggleExpand = (id) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.8,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <View style={styles.heroBg} />
          <SafeAreaView edges={["top"]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Mis cobros</Text>
                  <Text style={styles.heroSubtitle}>
                    Historial de pagos recibidos
                  </Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="receipt-outline" size={14} color={COLORS.info} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Total</Text>
                    <Text style={styles.kpiValue}>{totalPagos}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Aprobados</Text>
                    <Text style={styles.kpiValue}>{pagosAprobados}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.warning} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Monto</Text>
                    <Text style={styles.kpiValue} numberOfLines={1}>
                      Bs. {totalMonto.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMid} />
            <TextInput
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
              placeholderTextColor={COLORS.textLight}
              returnKeyType="search"
              onSubmitEditing={() => {
                setPage(1);
                fetchProducts(1);
              }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterToggle,
              (showFilters || hasFilters) && styles.filterToggleActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters || hasFilters ? "#fff" : COLORS.brand}
            />
            {hasFilters && !showFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Rango de fechas</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={styles.dateInput}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
                <Text style={styles.dateInputText}>{formatDate2(startDate)}</Text>
              </TouchableOpacity>

              <View style={styles.dateArrow}>
                <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} />
              </View>

              <TouchableOpacity
                onPress={() => setShowEndDatePicker(true)}
                style={styles.dateInput}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
                <Text style={styles.dateInputText}>{formatDate2(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearFilters}
                activeOpacity={0.85}
              >
                <Text style={styles.clearBtnText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setPage(1);
                  fetchProducts(1);
                  setShowFilters(false);
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="filter" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && salesData.length === 0 ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={salesData}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Sin pagos</Text>
                <Text style={styles.emptyDesc}>
                  No encontramos pagos con estos filtros
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <PaymentCard
                item={item}
                isExpanded={expandedId === item._id}
                onToggle={() => handleToggleExpand(item._id)}
                formatDate={formatDate}
                getPaymentStatusStyle={getPaymentStatusStyle}
              />
            )}
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={[styles.paginationBar, { marginBottom: insets.bottom + 12 }]}>
                  <View style={styles.paginationInner}>
                    <TouchableOpacity
                      onPress={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={16} color={page === 1 ? COLORS.textLight : COLORS.brand} />
                    </TouchableOpacity>
                    <View style={styles.pageDotsRow}>
                      {pagesToShow.map((num) => (
                        <TouchableOpacity
                          key={num}
                          onPress={() => setPage(num)}
                          style={[styles.pageBtn, page === num && styles.pageBtnActive]}
                          activeOpacity={0.8}
                        >
                          <Text style={page === num ? styles.pageTextActive : styles.pageText}>
                            {num}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      style={[styles.pageNavBtn, page === totalPages && styles.pageNavBtnDisabled]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-forward" size={16} color={page === totalPages ? COLORS.textLight : COLORS.brand} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.pageCounter}>Página {page} de {totalPages}</Text>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

