
import { Ionicons } from "@expo/vector-icons";
const MUNI_COLOR = "#475569";
const MUNI_COLOR_LIGHT = "#64748B";
import { CERCADO_OSM, VINTO, SACABA, QUILLACOLLO, TIQUIPAYA, COLCAPIRHUA } from "./CitiesCoordinates";

function buildPolygon(data) {

const relation =
data?.elements?.find(
e=>e.type==="relation"
);

if(!relation) return [];
    let ways = relation.members
        .filter(m => m.role === "outer" && m.geometry)
        .map(w => [...w.geometry]);

    let polygon = [...ways.shift()];

    while (ways.length) {

        const last = polygon[polygon.length - 1];

        const idx = ways.findIndex(w => {

            const start = w[0];
            const end = w[w.length - 1];

            return (
                (Math.abs(start.lat - last.lat) < 1e-6 &&
                 Math.abs(start.lon - last.lon) < 1e-6)
                ||
                (Math.abs(end.lat - last.lat) < 1e-6 &&
                 Math.abs(end.lon - last.lon) < 1e-6)
            );
        });

        if (idx === -1) break;

        let next = ways.splice(idx, 1)[0];

        const start = next[0];
        const end = next[next.length - 1];

        if (
            Math.abs(end.lat - last.lat) < 1e-6 &&
            Math.abs(end.lon - last.lon) < 1e-6
        ) {
            next.reverse();
        }

        polygon.push(...next.slice(1));
    }

    return polygon.map(p => ({
        lat: p.lat,
        lng: p.lon
    }));
}
export const isPointInMunicipio = (lat, lng, municipio) => {
    if (!municipio || !municipio.bounds) return false;
    const { north, south, east, west } = municipio.bounds;
    return lat <= north && lat >= south && lng <= east && lng >= west;
};
export const MUNICIPIOS_COCHABAMBA = {
    cercado: {
        id: "cercado",
        name: "Cercado",
        fullName: "Cochabamba (Cercado)",
        color: MUNI_COLOR,
        accent: "#0EA5E9",
        fillColor: "#0EA5E9",
        fillOpacity: 0.06,
        strokeColor: "#0EA5E9",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.3895, lng: -66.1568 },
        bounds: {
            north: -17.345,
            south: -17.430,
            east: -66.105,
            west: -66.205,
        },
       paths: buildPolygon(CERCADO_OSM),
    },
    quillacollo: {
        id: "quillacollo",
        name: "Quillacollo",
        fullName: "Quillacollo",
        color: MUNI_COLOR,
        accent: "#7C3AED",
        fillColor: "#7C3AED",
        fillOpacity: 0.06,
        strokeColor: "#7C3AED",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.395, lng: -66.270 },
        bounds: {
            north: -17.345,
            south: -17.450,
            east: -66.245,
            west: -66.310,
        },
        paths: buildPolygon(QUILLACOLLO),
    },
    sacaba: {
        id: "sacaba",
        name: "Sacaba",
        fullName: "Sacaba",
        color: MUNI_COLOR,
        accent: "#059669",
        fillColor: "#059669",
        fillOpacity: 0.06,
        strokeColor: "#059669",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.390, lng: -66.045 },
        bounds: {
            north: -17.345,
            south: -17.445,
            east: -65.975,
            west: -66.100,
        },
       paths: buildPolygon(SACABA),
    },
    tiquipaya: {
        id: "tiquipaya",
        name: "Tiquipaya",
        fullName: "Tiquipaya",
        color: MUNI_COLOR,
        accent: "#CA8A04",
        fillColor: "#CA8A04",
        fillOpacity: 0.06,
        strokeColor: "#CA8A04",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.320, lng: -66.200 },
        bounds: {
            north: -17.270,
            south: -17.343,
            east: -66.150,
            west: -66.245,
        },
       paths: buildPolygon(TIQUIPAYA),
    },
    colcapirhua: {
        id: "colcapirhua",
        name: "Colcapirhua",
        fullName: "Colcapirhua",
        color: MUNI_COLOR,
        accent: "#DB2777",
        fillColor: "#DB2777",
        fillOpacity: 0.06,
        strokeColor: "#DB2777",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.395, lng: -66.225 },
        bounds: {
            north: -17.370,
            south: -17.425,
            east: -66.207,
            west: -66.243,
        },
              paths: buildPolygon(COLCAPIRHUA),

    },
    vinto: {
        id: "vinto",
        name: "Vinto",
        fullName: "Vinto",
        color: MUNI_COLOR,
        accent: "#EA580C",
        fillColor: "#EA580C",
        fillOpacity: 0.06,
        strokeColor: "#EA580C",
        strokeOpacity: 0.55,
        strokeWeight: 1.5,
        center: { lat: -17.410, lng: -66.340 },
        bounds: {
            north: -17.355,
            south: -17.460,
            east: -66.312,
            west: -66.395,
        },
              paths: buildPolygon(VINTO),

    },
};
export const getMunicipioForPoint = (lat, lng) => {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return null;

    const priority = ["cercado", "quillacollo", "sacaba", "colcapirhua", "tiquipaya", "vinto"];

    for (const id of priority) {
        const m = MUNICIPIOS_COCHABAMBA[id];
        if (isPointInMunicipio(numLat, numLng, m)) return m;
    }

    let closest = null;
    let minDistance = Infinity;

    Object.values(MUNICIPIOS_COCHABAMBA).forEach(m => {
        const d = Math.sqrt(
            Math.pow(numLat - m.center.lat, 2) +
            Math.pow(numLng - m.center.lng, 2)
        );
        if (d < minDistance) {
            minDistance = d;
            closest = m;
        }
    });

    if (minDistance < 0.15) return closest;
    return null;
};

export const groupClientsByMunicipio = (clients) => {
    const groups = {};

    Object.keys(MUNICIPIOS_COCHABAMBA).forEach(id => {
        groups[id] = { municipio: MUNICIPIOS_COCHABAMBA[id], count: 0, clients: [] };
    });
    groups.other = { municipio: null, count: 0, clients: [] };

    clients.forEach(client => {
        const lat = client?.client_location?.latitud;
        const lng = client?.client_location?.longitud;
        if (!lat || !lng) return;

        const m = getMunicipioForPoint(lat, lng);
        if (m) {
            groups[m.id].count++;
            groups[m.id].clients.push(client);
        } else {
            groups.other.count++;
            groups.other.clients.push(client);
        }
    });

    return groups;
};
// Algoritmo ray-casting para verificar si un punto cae dentro de un polígono
function pointInPolygon(lat,lng,polygon){

    let inside=false;

    for(
        let i=0,j=polygon.length-1;
        i<polygon.length;
        j=i++
    ){

        const xi=polygon[i].lng;
        const yi=polygon[i].lat;

        const xj=polygon[j].lng;
        const yj=polygon[j].lat;

        const intersect=
            ((yi>lat)!=(yj>lat)) &&
            (
                lng<
                ((xj-xi)*(lat-yi))/
                (yj-yi)+xi
            );

        if(intersect)
            inside=!inside;
    }

    return inside;
}

export function getMunicipio(lat,lng){

    const lat0 = Number(lat);
    const lng0 = Number(lng);

    if(isNaN(lat0)||isNaN(lng0)) return null;

    const order = [
        "colcapirhua",
        "tiquipaya",
        "vinto",
        "quillacollo",
        "sacaba",
        "cercado"
    ];

    for(const key of order){

        const m = MUNICIPIOS_COCHABAMBA[key];

        if(!m?.paths) continue;

        if(pointInPolygon(lat0,lng0,m.paths)){
            return key;
        }
    }

    return "cercado";
}

export function inferZoneFromClient(client) {
  const lat = client.client_location?.latitud;
  const lng = client.client_location?.longitud;
  if (lat && lng) {
    const m = getMunicipio(lat, lng);
    if (m) return m;
  }

  const cityStr = (client.client_location?.city || "").toLowerCase();
  for (const key of Object.keys(MUNICIPIOS_COCHABAMBA)) {
    if (cityStr.includes(key.toLowerCase())) return key;
  }
  return "Cercado";
}


const CATEGORY_NORMALIZE = (raw) => {
  if (!raw) return "default";
  const s = raw.toString().toLowerCase().trim();
  if (s.includes("bar") || s.includes("pub") || s.includes("cantina")) return "bar";
  if (s.includes("restaur") || s.includes("comid") || s.includes("pollo") || s.includes("almuerz")) return "restaurante";
  if (s.includes("snack") || s.includes("hamburg") || s.includes("salt") || s.includes("pizzer")) return "snack";
  if (s.includes("super") || s.includes("merc")) return "supermercado";
  if (s.includes("mayor")) return "mayorista";
  if (s.includes("licor") || s.includes("botiller") || s.includes("vino")) return "licoreria";
  if (s.includes("tienda") || s.includes("almac") || s.includes("bodeg")) return "tienda";
  if (s.includes("kiosk") || s.includes("kiosc") || s.includes("puesto")) return "kiosko";
  if (s.includes("hotel") || s.includes("hospedaj")) return "hotel";
  if (s.includes("disco") || s.includes("karaoke") || s.includes("club")) return "discoteca";
  return "default";
};

export const CATEGORY_CONFIG = {
  bar: {
    label: "Bar",
    icon: "beer",
    color: "#7C3AED",
    bg: "#EFE9FF",
  },
  restaurante: {
    label: "Restaurante",
    icon: "restaurant",
    color: "#DC2626",
    bg: "#FEECEC",
  },
  snack: {
    label: "Snack",
    icon: "fast-food",
    color: "#EA580C",
    bg: "#FFEDD5",
  },
  supermercado: {
    label: "Supermercado",
    icon: "cart",
    color: "#0891B2",
    bg: "#E0F7FA",
  },
  mayorista: {
    label: "Mayorista",
    icon: "business",
    color: "#1F2937",
    bg: "#E5E7EB",
  },
  licoreria: {
    label: "Licorería",
    icon: "wine",
    color: "#9333EA",
    bg: "#F3E8FF",
  },
  tienda: {
    label: "Tienda",
    icon: "storefront",
    color: "#16A34A",
    bg: "#DCFCE7",
  },
  kiosko: {
    label: "Kiosko",
    icon: "cube",
    color: "#0EA5E9",
    bg: "#E0F2FE",
  },
  hotel: {
    label: "Hotel",
    icon: "bed",
    color: "#7C2D12",
    bg: "#FEF3C7",
  },
  discoteca: {
    label: "Discoteca",
    icon: "musical-notes",
    color: "#DB2777",
    bg: "#FCE7F3",
  },
  default: {
    label: "Negocio",
    icon: "storefront",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
};

export function getCategoryConfig(userCategory) {
  const key = CATEGORY_NORMALIZE(userCategory);
  return CATEGORY_CONFIG[key];
}


export function buildStackingPlan(route) {
  if (!route || !route[0] || !Array.isArray(route[0].route)) {
    return { totalBoxes: 0, totalHalves: 0, totalFulls: 0, byClient: [] };
  }
  const stops = route[0].route;
  const byClientMap = new Map();
  let totalBoxes = 0;
  let totalHalves = 0;
  let totalFulls = 0;

  for (const stop of stops) {
    if (!stop.client_location) continue;
    const key = stop.client_location._id || stop._id;
    const clientName = `${stop.name || ""} ${stop.lastName || ""}`.trim() || "Sin nombre";
    if (!byClientMap.has(key)) {
      byClientMap.set(key, {
        clientName,
        category: stop.userCategory,
        clientId: key,
        cajas: 0,
        medias: 0,
        completas: 0,
        productos: [],
      });
    }
    const c = byClientMap.get(key);

    // Cada pedido tiene productos
    const productos = stop.productos || stop.products || stop.order?.products || [];
    for (const p of productos) {
      const qty = Number(p.quantity || p.qty || 0);
      const isHalf = p.isHalfBox || p.halfBox || /media|6/i.test(p.unit || "");
      const boxes = isHalf ? qty * 0.5 : qty;

      c.cajas += boxes;
      if (isHalf) c.medias += qty;
      else c.completas += qty;

      totalBoxes += boxes;
      if (isHalf) totalHalves += qty;
      else totalFulls += qty;

      const existingProduct = c.productos.find((x) => x.name === (p.name || p.productName));
      if (existingProduct) {
        existingProduct.qty += qty;
      } else {
        c.productos.push({
          name: p.name || p.productName || "Producto",
          qty,
          isHalf,
        });
      }
    }
  }

  return {
    totalBoxes,
    totalHalves,
    totalFulls,
    byClient: Array.from(byClientMap.values()),
  };
}