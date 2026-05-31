const BOTTLES_PER_FULL_BOX = 12;
const BOTTLES_PER_HALF_BOX = 6;

export const calculateProductPacking = (quantity) => {
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
        return { fullBoxes: 0, halfBoxes: 0, looseBottles: 0, totalBottles: 0 };
    }
    const fullBoxes = Math.floor(qty / BOTTLES_PER_FULL_BOX);
    const remainderAfterFull = qty % BOTTLES_PER_FULL_BOX;
    const halfBoxes = Math.floor(remainderAfterFull / BOTTLES_PER_HALF_BOX);
    const looseBottles = remainderAfterFull % BOTTLES_PER_HALF_BOX;
    return { fullBoxes, halfBoxes, looseBottles, totalBottles: qty };
};

export const calculateOrderPacking = (order) => {
    if (!order?.products || !Array.isArray(order.products)) {
        return {
            fullBoxes: 0, halfBoxes: 0, looseBottles: 0, totalBottles: 0,
            physicalBoxes: 0, productBreakdown: [],
        };
    }

    let totalFull = 0;
    let totalHalf = 0;
    let totalLoose = 0;
    let totalBottles = 0;
    const productBreakdown = [];

    for (const product of order.products) {
        const packing = calculateProductPacking(product.cantidad);
        totalFull += packing.fullBoxes;
        totalHalf += packing.halfBoxes;
        totalLoose += packing.looseBottles;
        totalBottles += packing.totalBottles;
        productBreakdown.push({
            nombre: product.nombre,
            cantidad: product.cantidad,
            ...packing,
        });
    }

    const mixedBoxes = Math.ceil(totalLoose / BOTTLES_PER_FULL_BOX);
    const physicalBoxes = totalFull + totalHalf + mixedBoxes;

    return {
        fullBoxes: totalFull, halfBoxes: totalHalf, looseBottles: totalLoose,
        mixedBoxes, physicalBoxes, totalBottles, productBreakdown,
    };
};

export const consolidateOrdersByClient = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];

    const groups = new Map();

    for (const order of orders) {
        const clientId = order?.id_client?._id || order?.clientId || "unknown";
        const locId = order?.client_location?._id || order?.id_client?.client_location?._id || "no-loc";
        const key = `${clientId}__${locId}`;

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                clientId,
                locId,
                id_client: order.id_client,
                client_location: order.client_location || order.id_client?.client_location,
                name: order.id_client?.name || order.name,
                lastName: order.id_client?.lastName || order.lastName,
                profilePicture: order.id_client?.identificationImage || order.profilePicture,
                visitStatus: order.visitStatus,
                visitStatus1: order.visitStatus1,
                visitTime: order.visitTime,
                visitStartTime: order.visitStartTime,
                visitEndTime: order.visitEndTime,
                tripTime: order.tripTime,
                distanceTrip: order.distanceTrip,
                orders: [],
                totalAmount: 0,
                totalBoxes: 0,
                totalBottles: 0,
            });
        }

        const group = groups.get(key);
        group.orders.push(order);
        group.totalAmount += Number(order.totalAmount) || 0;

        const packing = calculateOrderPacking(order);
        group.totalBoxes += packing.physicalBoxes;
        group.totalBottles += packing.totalBottles;

        if (order.visitStatus1 === "LLego al destino") {
            group.visitStatus1 = "LLego al destino";
        } else if (order.visitStatus1 === "Pedido entregado" && group.visitStatus1 !== "LLego al destino") {
            group.visitStatus1 = "Pedido entregado";
        } else if (order.visitStatus1 === "En camino" && !["LLego al destino", "Pedido entregado"].includes(group.visitStatus1)) {
            group.visitStatus1 = "En camino";
        }
    }

    return Array.from(groups.values());
};

export const generateDetailedStackingPlan = (orders) => {
    const fullBoxesDetailed = [];
    const halfBoxesDetailed = [];
    const looseBottlesPool = [];

    for (const order of orders) {
        const clientName = order?.id_client
            ? `${order.id_client.name || ""} ${order.id_client.lastName || ""}`.trim()
            : order?.name
            ? `${order.name} ${order.lastName || ""}`.trim()
            : "Cliente";
        const receiveNumber = order.receiveNumber || "—";

        if (!order?.products || !Array.isArray(order.products)) continue;

        for (const product of order.products) {
            const packing = calculateProductPacking(product.cantidad);

            for (let i = 0; i < packing.fullBoxes; i++) {
                fullBoxesDetailed.push({
                    producto: product.nombre,
                    cliente: clientName,
                    receiveNumber,
                    bottles: BOTTLES_PER_FULL_BOX,
                });
            }

            for (let i = 0; i < packing.halfBoxes; i++) {
                halfBoxesDetailed.push({
                    producto: product.nombre,
                    cliente: clientName,
                    receiveNumber,
                    bottles: BOTTLES_PER_HALF_BOX,
                });
            }

            if (packing.looseBottles > 0) {
                looseBottlesPool.push({
                    producto: product.nombre,
                    cliente: clientName,
                    receiveNumber,
                    bottles: packing.looseBottles,
                });
            }
        }
    }

    const mixedBoxes = [];
    let currentBox = { contents: [], totalBottles: 0 };

    looseBottlesPool.sort((a, b) => b.bottles - a.bottles);

    for (const item of looseBottlesPool) {
        let remaining = item.bottles;

        while (remaining > 0) {
            const spaceLeft = BOTTLES_PER_FULL_BOX - currentBox.totalBottles;
            const toAdd = Math.min(remaining, spaceLeft);

            const existing = currentBox.contents.find(
                c => c.producto === item.producto &&
                     c.cliente === item.cliente &&
                     c.receiveNumber === item.receiveNumber
            );

            if (existing) {
                existing.bottles += toAdd;
            } else {
                currentBox.contents.push({
                    producto: item.producto,
                    cliente: item.cliente,
                    receiveNumber: item.receiveNumber,
                    bottles: toAdd,
                });
            }

            currentBox.totalBottles += toAdd;
            remaining -= toAdd;

            if (currentBox.totalBottles >= BOTTLES_PER_FULL_BOX) {
                mixedBoxes.push(currentBox);
                currentBox = { contents: [], totalBottles: 0 };
            }
        }
    }

    if (currentBox.totalBottles > 0) {
        mixedBoxes.push(currentBox);
    }

    const totalLoose = looseBottlesPool.reduce((s, x) => s + x.bottles, 0);

    return {
        bottom: {
            count: fullBoxesDetailed.length,
            bottlesPerUnit: BOTTLES_PER_FULL_BOX,
            totalBottles: fullBoxesDetailed.length * BOTTLES_PER_FULL_BOX,
            boxes: fullBoxesDetailed,
        },
        middle: {
            count: halfBoxesDetailed.length,
            bottlesPerUnit: BOTTLES_PER_HALF_BOX,
            totalBottles: halfBoxesDetailed.length * BOTTLES_PER_HALF_BOX,
            boxes: halfBoxesDetailed,
        },
        top: {
            count: mixedBoxes.length,
            looseBottles: totalLoose,
            boxes: mixedBoxes,
        },
        totalPhysicalBoxes: fullBoxesDetailed.length + halfBoxesDetailed.length + mixedBoxes.length,
        totalBottles:
            fullBoxesDetailed.length * BOTTLES_PER_FULL_BOX +
            halfBoxesDetailed.length * BOTTLES_PER_HALF_BOX +
            totalLoose,
    };
};

export const calculateRouteSummary = (routeData) => {
    if (!routeData?.[0]?.route) {
        return {
            totalOrders: 0,
            totalBoxes: 0,
            totalBottles: 0,
            fullBoxes: 0,
            halfBoxes: 0,
            looseBottles: 0,
            stackingPlan: null,
        };
    }

    const orders = routeData[0].route;
    const stackingPlan = generateDetailedStackingPlan(orders);
    const consolidatedStops = consolidateOrdersByClient(orders);

    let totalAmount = 0;
    orders.forEach(o => {
        totalAmount += Number(o.totalAmount) || 0;
    });

    return {
        totalOrders: orders.length,
        totalStops: consolidatedStops.length,
        totalBoxes: stackingPlan.totalPhysicalBoxes,
        totalBottles: stackingPlan.totalBottles,
        fullBoxes: stackingPlan.bottom.count,
        halfBoxes: stackingPlan.middle.count,
        looseBottles: stackingPlan.top.looseBottles,
        totalAmount,
        stackingPlan,
        consolidatedStops,
        tripNumber: routeData[0].tripNumber,
        totalTrips: routeData[0].totalTrips,
        capacity: routeData[0].capacity,
        estimatedDistance: routeData[0].estimatedDistance,
        estimatedTime: routeData[0].estimatedTime,
    };
};