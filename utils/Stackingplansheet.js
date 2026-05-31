import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const BOXES_PER_LEVEL = 16;
const TOTAL_LEVELS = 5;

const C = {
  full: "#1f2937",
  half: "#f59e0b",
  empty: "#e5e7eb",
  text: "#111827",
  textMid: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  card: "#ffffff",
};

export default function StackingPlanSheet({ visible, onClose, route, tripColor = "#D3423E" }) {
  const [expanded, setExpanded] = useState(true);

  const stackingPlan = route?.[0]?.stackingPlan || null;

  const fullBoxes = stackingPlan?.bottom?.count || 0;
  const halfBoxes = stackingPlan?.middle?.count || 0;
  const mixedBoxes = stackingPlan?.top?.count || 0;
  const looseBottles = stackingPlan?.top?.looseBottles || 0;
  const totalBottles = stackingPlan?.totalBottles || 0;
  const totalBoxes = stackingPlan?.totalPhysicalBoxes || fullBoxes + halfBoxes + mixedBoxes;
  const topBoxes = stackingPlan?.top?.boxes || [];

  const sequence = [
    ...Array(fullBoxes).fill("full"),
    ...Array(halfBoxes).fill("half"),
    ...Array(mixedBoxes).fill("mixed"),
  ];

  const levels = [];
  for (let lvl = 0; lvl < TOTAL_LEVELS; lvl++) {
    const start = lvl * BOXES_PER_LEVEL;
    const cells = [];
    for (let i = 0; i < BOXES_PER_LEVEL; i++) cells.push(sequence[start + i] || "empty");
    cells.reverse();
    levels.push(cells);
  }
  levels.reverse();

  const usedLevels = Math.ceil(totalBoxes / BOXES_PER_LEVEL) || 0;
  const fillPct = Math.round((totalBoxes / (TOTAL_LEVELS * BOXES_PER_LEVEL)) * 100);

  const cellColor = (type) => (type === "mixed" ? tripColor : C[type]);

  const getBoxContents = (box) => {
    if (Array.isArray(box?.contents)) return box.contents;
    if (box?.producto) return [box];
    return [];
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: tripColor }]}>
                <Ionicons name="cube" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Plan de carga</Text>
                <Text style={styles.headerSub}>Apilado en el camión</Text>
              </View>
            </View>
            <View style={[styles.totalBadge, { backgroundColor: tripColor }]}>
              <Text style={styles.totalBadgeText}>{totalBoxes}/80</Text>
            </View>
          </View>

          {!stackingPlan ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={40} color={C.textLight} />
              <Text style={styles.emptyText}>Esta ruta no tiene plan de carga</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: height * 0.62 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.truckBox}>
                {levels.map((cells, idx) => {
                  const levelNum = TOTAL_LEVELS - idx;
                  const hasBoxes = cells.some((c) => c !== "empty");
                  return (
                    <View key={idx} style={styles.levelRow}>
                      <Text style={[styles.levelNum, { color: hasBoxes ? C.text : C.textLight }]}>
                        {levelNum}
                      </Text>
                      <View style={styles.cellsRow}>
                        {cells.map((type, ci) => (
                          <View
                            key={ci}
                            style={[
                              styles.cell,
                              {
                                backgroundColor: cellColor(type),
                                borderWidth: type === "empty" ? 1 : 0,
                                borderColor: "#d1d5db",
                                borderStyle: "dashed",
                              },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
                <View style={styles.truckFooter}>
                  <Text style={styles.truckFooterText}>Base ↓ · Techo ↑</Text>
                  <Text style={styles.truckFooterText}>
                    {usedLevels} de {TOTAL_LEVELS} niveles · {fillPct}%
                  </Text>
                </View>
              </View>

              <View style={styles.legendRow}>
                {fullBoxes > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: C.full }]} />
                    <Text style={styles.legendText}>{fullBoxes} ×12</Text>
                  </View>
                )}
                {halfBoxes > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: C.half }]} />
                    <Text style={styles.legendText}>{halfBoxes} ×6</Text>
                  </View>
                )}
                {mixedBoxes > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: tripColor }]} />
                    <Text style={styles.legendText}>{mixedBoxes} mixtas</Text>
                  </View>
                )}
                {looseBottles > 0 && (
                  <Text style={styles.legendText}>🍾 {looseBottles} sueltas</Text>
                )}
                <Text style={[styles.legendText, { marginLeft: "auto", color: C.textLight }]}>
                  {totalBottles} bot.
                </Text>
              </View>

              {topBoxes.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.expandBtn}
                    onPress={() => setExpanded(!expanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expandBtnText}>
                      Contenido de cajas mixtas ({topBoxes.length})
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={C.textMid}
                    />
                  </TouchableOpacity>

                  {expanded &&
                    topBoxes.map((box, i) => {
                      const contents = getBoxContents(box);
                      const boxBottles = contents.reduce(
                        (s, c) => s + (Number(c.bottles) || 0),
                        0
                      );
                      return (
                        <View key={i} style={styles.mixedBox}>
                          <View style={[styles.mixedBoxHead, { backgroundColor: `${tripColor}12` }]}>
                            <View style={[styles.mixedBoxNum, { backgroundColor: tripColor }]}>
                              <Text style={styles.mixedBoxNumText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.mixedBoxTitle}>Caja {i + 1}</Text>
                            <View style={styles.mixedBoxBottles}>
                              <Ionicons name="wine" size={11} color={C.textMid} />
                              <Text style={styles.mixedBoxBottlesText}>{boxBottles}</Text>
                            </View>
                          </View>
                          {contents.length > 0 ? (
                            contents.map((item, ci) => (
                              <View key={ci} style={styles.contentRow}>
                                <View style={[styles.qtyBadge, { backgroundColor: tripColor }]}>
                                  <Text style={styles.qtyBadgeText}>{item.bottles}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.productName} numberOfLines={1}>
                                    {item.producto || "Producto"}
                                  </Text>
                                  <View style={styles.clientRow}>
                                    <Ionicons name="person" size={8} color={C.textLight} />
                                    <Text style={styles.clientText}>
                                      {item.cliente || "Cliente"}
                                      {item.receiveNumber ? `  ·  #${item.receiveNumber}` : ""}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noContent}>Sin detalle de contenido</Text>
                          )}
                        </View>
                      );
                    })}
                </View>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  headerSub: { fontSize: 11, color: C.textMid, marginTop: 1 },
  totalBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  totalBadgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: C.textMid, fontSize: 13 },

  truckBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 10,
  },
  levelRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  levelNum: { width: 14, textAlign: "right", fontSize: 9, fontWeight: "800", marginRight: 6 },
  cellsRow: { flex: 1, flexDirection: "row", gap: 2 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 2 },
  truckFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  truckFooterText: { fontSize: 9, fontWeight: "700", color: C.textMid, textTransform: "uppercase" },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: "700", color: C.textMid },

  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expandBtnText: { fontSize: 11, fontWeight: "700", color: C.textMid, textTransform: "uppercase" },

  mixedBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  mixedBoxHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mixedBoxNum: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  mixedBoxNumText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  mixedBoxTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: C.text },
  mixedBoxBottles: { flexDirection: "row", alignItems: "center", gap: 3 },
  mixedBoxBottlesText: { fontSize: 11, fontWeight: "700", color: C.textMid },

  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  qtyBadge: { minWidth: 24, paddingHorizontal: 6, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  qtyBadgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  productName: { fontSize: 12, fontWeight: "700", color: C.text },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  clientText: { fontSize: 10, color: C.textMid },
  noContent: { fontSize: 10, color: C.textLight, fontStyle: "italic", padding: 12 },

  closeBtn: {
    marginTop: 14,
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "800", color: C.text },
});