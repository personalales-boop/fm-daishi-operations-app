const STORAGE_KEY = "care-route-kawasaki-v1";
const AUTO_REFRESH_MS = 180000;
const DEFAULT_BASE_ADDRESS = "川崎市川崎区大師町10-6";
const KAWASAKI_CENTER = [35.5297, 139.7081];
const KAWASAKI_BOUNDS = {
  south: 35.485,
  west: 139.665,
  north: 35.565,
  east: 139.835,
};

const vehicles = [
  { id: "car1", name: "1号車", capacity: 4, wheelchair: false, note: "通常送迎 / 4名までが多い" },
  { id: "car2", name: "2号車", capacity: 4, wheelchair: true, note: "車椅子対応 / 4名まで" },
  { id: "car3", name: "3号車", capacity: 8, wheelchair: false, note: "定員8名 / 多人数向け" },
  { id: "car4", name: "4号車", capacity: 5, wheelchair: false, note: "定員5名 / 中型" },
];

const samplePatients = [
  {
    id: "sample-daishi",
    name: "大師 太郎様",
    address: "川崎市川崎区大師町4 大師公園",
    passengers: 1,
    wheelchair: false,
    earliest: "09:00",
    latest: "09:45",
  },
  {
    id: "sample-oda",
    name: "小田 花子様",
    address: "川崎市川崎区小田栄2 小田栄駅",
    passengers: 1,
    wheelchair: false,
    earliest: "09:20",
    latest: "10:20",
  },
  {
    id: "sample-minato",
    name: "港町 一郎様",
    address: "川崎市川崎区港町12 港町駅",
    passengers: 1,
    wheelchair: true,
    earliest: "09:40",
    latest: "10:40",
  },
  {
    id: "sample-hama",
    name: "浜川崎 幸子様",
    address: "川崎市川崎区鋼管通5 浜川崎駅",
    passengers: 1,
    wheelchair: false,
    earliest: "10:00",
    latest: "11:00",
  },
];

const knownLocations = [
  { key: "大師町10-6", lat: 35.5338309, lon: 139.7306612 },
  { key: "大師町10番6", lat: 35.5338309, lon: 139.7306612 },
  { key: "川崎区役所", lat: 35.53082, lon: 139.70306 },
  { key: "東田町8", lat: 35.53082, lon: 139.70306 },
  { key: "大師公園", lat: 35.53591, lon: 139.73007 },
  { key: "川崎大師駅", lat: 35.53474, lon: 139.72575 },
  { key: "小田栄駅", lat: 35.51537, lon: 139.70516 },
  { key: "浜川崎駅", lat: 35.51044, lon: 139.7134 },
  { key: "港町駅", lat: 35.53519, lon: 139.71393 },
  { key: "鈴木町駅", lat: 35.53641, lon: 139.72024 },
];

const els = {
  startAddress: document.getElementById("startAddress"),
  endAddress: document.getElementById("endAddress"),
  startTime: document.getElementById("startTime"),
  useLocationButton: document.getElementById("useLocationButton"),
  useNowTime: document.getElementById("useNowTime"),
  vehicleGrid: document.getElementById("vehicleGrid"),
  patientForm: document.getElementById("patientForm"),
  patientName: document.getElementById("patientName"),
  patientAddress: document.getElementById("patientAddress"),
  patientPassengers: document.getElementById("patientPassengers"),
  patientEarliest: document.getElementById("patientEarliest"),
  patientLatest: document.getElementById("patientLatest"),
  patientWheelchair: document.getElementById("patientWheelchair"),
  sampleButton: document.getElementById("sampleButton"),
  clearPatientsButton: document.getElementById("clearPatientsButton"),
  patientList: document.getElementById("patientList"),
  optimizeButton: document.getElementById("optimizeButton"),
  autoRefreshButton: document.getElementById("autoRefreshButton"),
  googleMapsButton: document.getElementById("googleMapsButton"),
  statusText: document.getElementById("statusText"),
  fitMapButton: document.getElementById("fitMapButton"),
  resultPanel: document.getElementById("resultPanel"),
};

const state = loadState();
let map;
let markerLayer;
let routeLayer;
let lastRouteBounds = null;
let lastRouteSnapshot = null;
let lastGoogleMapsUrl = "";
let autoRefreshTimer = null;
const geocodeCache = new Map();

boot();

function boot() {
  renderVehicles();
  bindEvents();
  initMap();
  syncInputsFromState();
  renderPatients();
  syncAutoRefresh();
}

function bindEvents() {
  els.vehicleGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vehicle]");
    if (!button) return;
    state.vehicleId = button.dataset.vehicle;
    persist();
    renderVehicles();
    renderPatients();
  });

  [els.startAddress, els.endAddress, els.startTime].forEach((input) => {
    input.addEventListener("input", () => {
      state.startAddress = els.startAddress.value.trim();
      state.endAddress = els.endAddress.value.trim();
      state.startTime = els.startTime.value || "08:30";
      persist();
    });
  });
  els.useNowTime.addEventListener("change", () => {
    state.useNowTime = els.useNowTime.checked;
    persist();
  });

  els.patientForm.addEventListener("submit", addPatient);
  els.sampleButton.addEventListener("click", useSamplePatients);
  els.clearPatientsButton.addEventListener("click", clearPatients);
  els.patientList.addEventListener("click", removePatient);
  els.useLocationButton.addEventListener("click", useCurrentLocationAsStart);
  els.optimizeButton.addEventListener("click", optimizeRoute);
  els.autoRefreshButton.addEventListener("click", toggleAutoRefresh);
  els.googleMapsButton.addEventListener("click", openGoogleMapsRoute);
  els.fitMapButton.addEventListener("click", fitRouteBounds);
  window.addEventListener("beforeunload", () => window.clearInterval(autoRefreshTimer));
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(KAWASAKI_CENTER, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
}

function renderVehicles() {
  els.vehicleGrid.innerHTML = vehicles.map((vehicle) => `
    <button class="vehicle-card ${vehicle.id === state.vehicleId ? "active" : ""}" type="button" data-vehicle="${escapeHtml(vehicle.id)}">
      <strong>${escapeHtml(vehicle.name)}</strong>
      <span>定員 ${vehicle.capacity}名${vehicle.wheelchair ? " / 車椅子対応" : ""}</span>
      <span>${escapeHtml(vehicle.note)}</span>
    </button>
  `).join("");
}

function syncInputsFromState() {
  els.startAddress.value = state.startAddress;
  els.endAddress.value = state.endAddress;
  els.startTime.value = state.startTime;
  els.useNowTime.checked = state.useNowTime !== false;
}

function addPatient(event) {
  event.preventDefault();

  const patient = {
    id: makeId(),
    name: els.patientName.value.trim(),
    address: els.patientAddress.value.trim(),
    passengers: Math.max(1, Number(els.patientPassengers.value || 1)),
    wheelchair: els.patientWheelchair.checked,
    earliest: els.patientEarliest.value || "",
    latest: els.patientLatest.value || "",
  };

  if (!patient.name || !patient.address) {
    setStatus("お名前と住所を入力してください。", true);
    return;
  }

  state.patients.push(patient);
  persist();
  els.patientForm.reset();
  els.patientPassengers.value = "1";
  renderPatients();
  setStatus("患者様を追加しました。");
}

function removePatient(event) {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.patients = state.patients.filter((patient) => patient.id !== button.dataset.remove);
  persist();
  renderPatients();
  setStatus("患者様を削除しました。");
}

function useSamplePatients() {
  state.startAddress = DEFAULT_BASE_ADDRESS;
  state.endAddress = DEFAULT_BASE_ADDRESS;
  state.startTime = state.useNowTime !== false ? getCurrentTimeValue() : "08:45";
  state.vehicleId = "car2";
  state.patients = buildCurrentSamplePatients();
  persist();
  syncInputsFromState();
  renderVehicles();
  renderPatients();
  setStatus("川崎区内のサンプル患者様を入れました。");
}

function buildCurrentSamplePatients() {
  const start = state.useNowTime !== false ? timeToMinutes(getCurrentTimeValue()) + 15 : 9 * 60;
  return samplePatients.map((patient, index) => {
    const earliest = start + index * 20;
    return {
      ...patient,
      id: makeId(),
      earliest: formatMinutes(earliest),
      latest: formatMinutes(earliest + 45),
    };
  });
}

function clearPatients() {
  state.patients = [];
  persist();
  renderPatients();
  clearRoute();
  setStatus("患者様リストを空にしました。");
}

async function useCurrentLocationAsStart() {
  if (!navigator.geolocation) {
    setStatus("この端末では現在地を取得できません。", true);
    return;
  }

  setStatus("現在地を取得しています。");
  els.useLocationButton.disabled = true;
  try {
    const position = await getCurrentPosition();
    const location = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
    if (!isInKawasakiBounds(location)) {
      setStatus("現在地が川崎区外の可能性があります。必要なら住所を直接入力してください。", true);
    }
    state.startAddress = `${location.lat.toFixed(6)},${location.lon.toFixed(6)}`;
    els.startAddress.value = state.startAddress;
    persist();
    setStatus("現在地を出発地にしました。");
  } catch {
    setStatus("現在地の取得が許可されませんでした。住所を入力してください。", true);
  } finally {
    els.useLocationButton.disabled = false;
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

function toggleAutoRefresh() {
  state.autoRefresh = !state.autoRefresh;
  persist();
  syncAutoRefresh();
  if (state.autoRefresh) {
    optimizeRoute({ silent: true });
  }
}

function syncAutoRefresh() {
  window.clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
  els.autoRefreshButton.classList.toggle("active", Boolean(state.autoRefresh));
  els.autoRefreshButton.textContent = state.autoRefresh ? "自動更新中（3分）" : "3分ごとに自動更新";

  if (!state.autoRefresh) return;
  autoRefreshTimer = window.setInterval(() => {
    optimizeRoute({ silent: true });
  }, AUTO_REFRESH_MS);
}

function renderPatients() {
  const vehicle = getVehicle();
  const totalPassengers = getTotalPassengers();
  const wheelchairCount = state.patients.filter((patient) => patient.wheelchair).length;

  if (!state.patients.length) {
    els.patientList.innerHTML = `<div class="patient-card"><div><strong>患者様は未登録です</strong><span>住所と時間制約を入力するか、サンプルを入れてください。</span></div></div>`;
    return;
  }

  els.patientList.innerHTML = `
    <div class="patient-card">
      <div>
        <strong>合計 ${totalPassengers}名 / ${vehicle.name} 定員 ${vehicle.capacity}名</strong>
        <span>${wheelchairCount ? `車椅子 ${wheelchairCount}名` : "車椅子なし"} / ${getCapacityMessage(vehicle)}</span>
      </div>
    </div>
    ${state.patients.map((patient) => `
      <article class="patient-card">
        <div>
          <strong>${escapeHtml(patient.name)} ${patient.wheelchair ? "・車椅子" : ""}</strong>
          <span>${escapeHtml(patient.address)}</span>
          <span>${escapeHtml(formatWindow(patient))} / ${patient.passengers}名</span>
        </div>
        <button class="remove-button" type="button" data-remove="${escapeHtml(patient.id)}">削除</button>
      </article>
    `).join("")}
  `;
}

async function optimizeRoute(options = {}) {
  state.startAddress = els.startAddress.value.trim();
  state.endAddress = els.endAddress.value.trim();
  state.useNowTime = els.useNowTime.checked;
  state.startTime = state.useNowTime ? getCurrentTimeValue() : els.startTime.value || "08:30";
  els.startTime.value = state.startTime;
  persist();

  const validation = validatePlan();
  if (validation.blockers.length) {
    renderBlockingResult(validation.blockers, validation.warnings);
    setStatus("定員または車椅子対応を確認してください。", true);
    return;
  }

  setBusy(true, options.silent ? "自動更新で再確認しています。" : "住所を確認し、ルートを作成しています。");

  try {
    const start = await geocodeAddress(state.startAddress, "出発地");
    const end = state.endAddress ? await geocodeAddress(state.endAddress, "到着地") : null;
    const stops = [];
    for (const patient of state.patients) {
      const location = await geocodeAddress(patient.address, patient.name);
      stops.push({ ...patient, location });
      await sleep(180);
    }

    const best = findBestOrder(start, stops, end);
    const osrmRoute = await fetchDrivingRoute([start, ...best.ordered.map((item) => item.location), ...(end ? [end] : [])]);
    renderRoute(start, best, end, osrmRoute, validation.warnings);
    setStatus(options.silent ? `自動更新しました。${formatClock(new Date())}` : "ルートを作成しました。");
  } catch (error) {
    setStatus(error.message || "ルート作成に失敗しました。", true);
    renderError(error);
  } finally {
    setBusy(false);
  }
}

function validatePlan() {
  const vehicle = getVehicle();
  const totalPassengers = getTotalPassengers();
  const wheelchairCount = state.patients.filter((patient) => patient.wheelchair).length;
  const blockers = [];
  const warnings = [];

  if (!state.startAddress) blockers.push("出発地を入力してください。");
  if (!state.patients.length) blockers.push("患者様を1名以上追加してください。");
  if (totalPassengers > vehicle.capacity) {
    blockers.push(`${vehicle.name}の定員は${vehicle.capacity}名です。現在は合計${totalPassengers}名です。`);
  }
  if (wheelchairCount && !vehicle.wheelchair) {
    blockers.push("車椅子対応が必要な患者様がいます。2号車を選んでください。");
  }
  if (state.patients.some((patient) => patient.earliest && patient.latest && timeToMinutes(patient.earliest) > timeToMinutes(patient.latest))) {
    blockers.push("時間制約の開始時刻が終了時刻より後になっている患者様がいます。");
  }
  if (totalPassengers > 4 && vehicle.id !== "car3") {
    warnings.push("合計5名以上の送迎です。通常運用では3号車の利用も検討してください。");
  }
  warnings.push("無料モードです。3分ごとの道路ルート再取得と時間帯補正で、できるだけ現在状況に近づけます。");
  return { blockers, warnings };
}

function findBestOrder(start, stops, end) {
  const candidates = stops.length <= 7 ? permutations(stops) : [nearestNeighborOrder(start, stops)];
  let best = null;
  const startMinute = timeToMinutes(state.startTime || "08:30");

  for (const order of candidates) {
    const plan = scoreOrder(start, order, end, startMinute);
    if (!best || plan.score < best.score) best = plan;
  }

  return best;
}

function scoreOrder(start, order, end, startMinute) {
  let current = start;
  let cursor = startMinute;
  let distanceKm = 0;
  let lateMinutes = 0;
  const arrivals = [];

  for (const stop of order) {
    const km = haversineKm(current, stop.location);
    const travelMinutes = Math.max(4, Math.round((km / 22) * 60 * getLocalTrafficFactor(cursor)));
    cursor += travelMinutes;
    const earliest = stop.earliest ? timeToMinutes(stop.earliest) : null;
    const latest = stop.latest ? timeToMinutes(stop.latest) : null;
    const wait = earliest !== null && cursor < earliest ? earliest - cursor : 0;
    cursor += wait;
    const late = latest !== null && cursor > latest ? cursor - latest : 0;
    lateMinutes += late;
    arrivals.push({
      ...stop,
      eta: cursor,
      wait,
      late,
      travelMinutes,
    });
    cursor += 4;
    distanceKm += km;
    current = stop.location;
  }

  if (end) {
    const backKm = haversineKm(current, end);
    distanceKm += backKm;
    cursor += Math.max(4, Math.round((backKm / 22) * 60 * getLocalTrafficFactor(cursor)));
  }

  return {
    ordered: arrivals,
    estimatedMinutes: cursor - startMinute,
    distanceKm,
    lateMinutes,
    score: cursor - startMinute + lateMinutes * 400,
  };
}

function nearestNeighborOrder(start, stops) {
  const remaining = [...stops];
  const order = [];
  let current = start;
  while (remaining.length) {
    remaining.sort((a, b) => haversineKm(current, a.location) - haversineKm(current, b.location));
    const next = remaining.shift();
    order.push(next);
    current = next.location;
  }
  return order;
}

async function geocodeAddress(address, label) {
  const coordinate = parseCoordinate(address);
  if (coordinate) return coordinate;

  const known = knownLocations.find((item) => address.includes(item.key));
  if (known) return { lat: known.lat, lon: known.lon, label };

  const query = normalizeKawasakiAddress(address);
  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "jp",
    bounded: "1",
    viewbox: `${KAWASAKI_BOUNDS.west},${KAWASAKI_BOUNDS.north},${KAWASAKI_BOUNDS.east},${KAWASAKI_BOUNDS.south}`,
    q: query,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${label}の住所検索に失敗しました。`);
  const results = await response.json();
  if (!results.length) throw new Error(`${label}の住所が見つかりませんでした。川崎区内の住所を入力してください。`);
  const location = { lat: Number(results[0].lat), lon: Number(results[0].lon), label };
  if (!isInKawasakiBounds(location)) {
    throw new Error(`${label}は川崎区の範囲外の可能性があります。住所を確認してください。`);
  }
  geocodeCache.set(cacheKey, location);
  return location;
}

async function fetchDrivingRoute(points) {
  if (points.length < 2) return null;
  const coordinates = points.map((point) => `${point.lon},${point.lat}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "true",
    annotations: "duration,distance",
  });
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`);
  if (!response.ok) throw new Error("道路ルートAPIに接続できませんでした。");
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("道路ルートが見つかりませんでした。");
  return data.routes[0];
}

function renderRoute(start, plan, end, route, warnings) {
  clearRoute();
  const points = [start, ...plan.ordered.map((item) => item.location), ...(end ? [end] : [])];
  const routeWarnings = [...warnings];

  plan.ordered.forEach((stop) => {
    if (stop.late) routeWarnings.push(`${stop.name} は希望時間を ${stop.late}分 過ぎる見込みです。`);
  });

  if (route?.geometry) {
    const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    L.polyline(coords, { color: "#0b72d9", weight: 6, opacity: 0.9 }).addTo(routeLayer);
  } else {
    L.polyline(points.map((point) => [point.lat, point.lon]), { color: "#0b72d9", weight: 5, dashArray: "8 8" }).addTo(routeLayer);
  }

  addMarker(start, "出", "出発地", "start");
  plan.ordered.forEach((stop, index) => addMarker(stop.location, String(index + 1), stop.name));
  if (end) addMarker(end, "着", "到着地", "end");

  lastRouteBounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
  if (route?.geometry) {
    route.geometry.coordinates.forEach(([lon, lat]) => lastRouteBounds.extend([lat, lon]));
  }
  fitRouteBounds();

  const distanceKm = route ? route.distance / 1000 : plan.distanceKm;
  const driveMinutes = route ? Math.round(route.duration / 60) : plan.estimatedMinutes;
  const durationMinutes = Math.max(plan.estimatedMinutes, Math.round(driveMinutes * getLocalTrafficFactor(timeToMinutes(state.startTime))));
  const vehicle = getVehicle();
  const checkedAt = new Date();
  const previousSnapshot = lastRouteSnapshot;
  const deltaMinutes = previousSnapshot ? durationMinutes - previousSnapshot.durationMinutes : 0;
  const deltaText = previousSnapshot ? `${deltaMinutes >= 0 ? "+" : ""}${deltaMinutes}分` : "初回";
  const trafficLabel = getTrafficFactorLabel(timeToMinutes(state.startTime));

  if (previousSnapshot && Math.abs(deltaMinutes) >= 3) {
    routeWarnings.push(`前回確認から所要時間が ${deltaText} 変わりました。`);
  }
  if (state.autoRefresh) {
    routeWarnings.push("自動更新中です。3分ごとに道路ルートを再確認します。");
  }

  lastRouteSnapshot = {
    durationMinutes,
    distanceKm,
    checkedAt: checkedAt.toISOString(),
  };
  lastGoogleMapsUrl = buildGoogleMapsUrl(plan, end);
  els.googleMapsButton.disabled = !lastGoogleMapsUrl;

  els.resultPanel.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><span>車両</span><strong>${escapeHtml(vehicle.name)}</strong></div>
      <div class="summary-card"><span>人数</span><strong>${getTotalPassengers()} / ${vehicle.capacity}名</strong></div>
      <div class="summary-card"><span>距離</span><strong>${distanceKm.toFixed(1)}km</strong></div>
      <div class="summary-card"><span>目安</span><strong>${durationMinutes}分</strong></div>
    </div>
    <div class="live-status">
      <strong>最終確認 ${escapeHtml(formatClock(checkedAt))} / 前回比 ${escapeHtml(deltaText)}</strong>
      <span>${state.useNowTime ? "現在時刻で計算" : "指定時刻で計算"} / ${escapeHtml(trafficLabel)} / Googleマップで開くと端末側のライブ交通状況も確認できます。</span>
    </div>
    ${renderWarnings(routeWarnings, plan.lateMinutes)}
    <div class="result-list">
      ${plan.ordered.map((stop, index) => `
        <article class="result-stop">
          <div class="order-number">${index + 1}</div>
          <div>
            <strong>${escapeHtml(stop.name)} / ${formatMinutes(stop.eta)} 到着目安</strong>
            <span>${escapeHtml(stop.address)} / ${escapeHtml(formatWindow(stop))}${stop.wait ? ` / 待機 ${stop.wait}分` : ""}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderWarnings(warnings, lateMinutes) {
  const items = [...warnings];
  if (!lateMinutes) items.unshift("時間制約内に収まる見込みです。");
  return `<div class="warning-list">${items.map((warning) => `
    <div class="warning-item ${warning.includes("過ぎる") ? "danger" : ""}">${escapeHtml(warning)}</div>
  `).join("")}</div>`;
}

function renderBlockingResult(blockers, warnings) {
  clearRoute();
  els.resultPanel.innerHTML = `
    <div class="warning-list">
      ${blockers.map((item) => `<div class="warning-item danger">${escapeHtml(item)}</div>`).join("")}
      ${warnings.map((item) => `<div class="warning-item">${escapeHtml(item)}</div>`).join("")}
    </div>
  `;
}

function renderError(error) {
  els.resultPanel.innerHTML = `
    <div class="warning-list">
      <div class="warning-item danger">${escapeHtml(error.message || "エラーが発生しました。")}</div>
      <div class="warning-item">住所を「川崎市川崎区」から入力するか、サンプルで動作確認してください。</div>
    </div>
  `;
}

function addMarker(point, label, title, className = "") {
  const icon = L.divIcon({
    className: "",
    html: `<div class="route-marker ${escapeHtml(className)}">${escapeHtml(label)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  L.marker([point.lat, point.lon], { icon }).bindPopup(title).addTo(markerLayer);
}

function clearRoute() {
  markerLayer?.clearLayers();
  routeLayer?.clearLayers();
  lastRouteBounds = null;
  lastGoogleMapsUrl = "";
  els.googleMapsButton.disabled = true;
}

function fitRouteBounds() {
  if (lastRouteBounds?.isValid()) {
    map.fitBounds(lastRouteBounds.pad(0.18));
  } else {
    map.setView(KAWASAKI_CENTER, 13);
  }
}

function setBusy(isBusy, message = "") {
  els.optimizeButton.disabled = isBusy;
  els.optimizeButton.textContent = isBusy ? "作成中..." : "最速ルートを作成";
  if (message) setStatus(message);
}

function setStatus(message, danger = false) {
  els.statusText.textContent = message;
  els.statusText.style.color = danger ? "var(--red)" : "var(--muted)";
}

function openGoogleMapsRoute() {
  if (!lastGoogleMapsUrl) return;
  window.open(lastGoogleMapsUrl, "_blank", "noopener,noreferrer");
}

function buildGoogleMapsUrl(plan, end) {
  if (!state.startAddress || !plan.ordered.length) return "";
  const lastStop = plan.ordered[plan.ordered.length - 1];
  const destination = end ? state.endAddress : lastStop?.address;
  const waypoints = end ? plan.ordered.map((stop) => stop.address) : plan.ordered.slice(0, -1).map((stop) => stop.address);
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    origin: state.startAddress,
    destination: destination || state.startAddress,
  });
  if (waypoints.length) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getLocalTrafficFactor(minute) {
  const minutes = Number(minute || 0) % 1440;
  if (minutes >= 7 * 60 && minutes <= 9 * 60 + 30) return 1.2;
  if (minutes >= 16 * 60 + 30 && minutes <= 19 * 60) return 1.18;
  if (minutes >= 11 * 60 + 30 && minutes <= 13 * 60 + 30) return 1.08;
  return 1;
}

function getTrafficFactorLabel(minute) {
  const factor = getLocalTrafficFactor(minute);
  if (factor >= 1.18) return "朝夕の混雑時間帯として補正";
  if (factor > 1) return "昼の移動時間として軽く補正";
  return "通常時間帯として計算";
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatClock(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getVehicle() {
  return vehicles.find((vehicle) => vehicle.id === state.vehicleId) || vehicles[0];
}

function getTotalPassengers() {
  return state.patients.reduce((sum, patient) => sum + Number(patient.passengers || 1), 0);
}

function getCapacityMessage(vehicle) {
  if (getTotalPassengers() > vehicle.capacity) return "定員超過";
  if (state.patients.some((patient) => patient.wheelchair) && !vehicle.wheelchair) return "車椅子対応車を選択";
  return "定員内";
}

function formatWindow(patient) {
  if (patient.earliest && patient.latest) return `${patient.earliest}〜${patient.latest}`;
  if (patient.earliest) return `${patient.earliest}以降`;
  if (patient.latest) return `${patient.latest}まで`;
  return "時間指定なし";
}

function normalizeKawasakiAddress(address) {
  const text = String(address || "").trim();
  if (!text.includes("川崎市")) return `神奈川県川崎市川崎区 ${text}`;
  if (!text.includes("川崎区")) return `神奈川県川崎市川崎区 ${text}`;
  return text;
}

function parseCoordinate(text) {
  const match = String(text || "").match(/^\s*([0-9.]+)\s*,\s*([0-9.]+)\s*$/);
  if (!match) return null;
  const location = { lat: Number(match[1]), lon: Number(match[2]) };
  return isInKawasakiBounds(location) ? location : null;
}

function isInKawasakiBounds(location) {
  return location.lat >= KAWASAKI_BOUNDS.south &&
    location.lat <= KAWASAKI_BOUNDS.north &&
    location.lon >= KAWASAKI_BOUNDS.west &&
    location.lon <= KAWASAKI_BOUNDS.east;
}

function haversineKm(a, b) {
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(value) {
  const minutes = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const result = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    permutations(rest).forEach((order) => result.push([item, ...order]));
  });
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      return {
        startAddress: saved.startAddress || DEFAULT_BASE_ADDRESS,
        endAddress: saved.endAddress || DEFAULT_BASE_ADDRESS,
        startTime: saved.startTime || "08:30",
        useNowTime: saved.useNowTime !== false,
        autoRefresh: Boolean(saved.autoRefresh),
        vehicleId: saved.vehicleId || "car1",
        patients: Array.isArray(saved.patients) ? saved.patients : [],
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return {
    startAddress: DEFAULT_BASE_ADDRESS,
    endAddress: DEFAULT_BASE_ADDRESS,
    startTime: "08:30",
    useNowTime: true,
    autoRefresh: false,
    vehicleId: "car1",
    patients: [],
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
