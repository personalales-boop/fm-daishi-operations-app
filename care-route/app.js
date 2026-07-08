const STORAGE_KEY = "care-route-kawasaki-v1";
const SESSION_STORAGE_KEY = "care-route-session-token";
const REVIEW_SESSION_STORAGE_KEY = "care-route-review-session";
const AUTO_REFRESH_MS = 180000;
const DEFAULT_BASE_ADDRESS = "川崎市川崎区大師町10-6";
const BASE_LOCATION = { lat: 35.5338309, lon: 139.7306612 };
const INITIAL_MAP_ZOOM = 16;
const KAWASAKI_BOUNDS = {
  south: 35.485,
  west: 139.665,
  north: 35.565,
  east: 139.835,
};

const vehicles = [
  { id: "car1", name: "1号車", capacity: 5, wheelchair: true, wheelchairCapacity: 2, note: "車いす2台 / 座席5名まで" },
  { id: "car2", name: "2号車", capacity: 5, wheelchair: true, wheelchairCapacity: 2, note: "車いす2台 / 座席5名まで" },
  { id: "car3", name: "3号車", capacity: 8, wheelchair: false, wheelchairCapacity: 0, note: "座席8名 / 多人数向け" },
  { id: "car4", name: "4号車", capacity: 5, wheelchair: false, wheelchairCapacity: 0, note: "座席5名 / 車いす不可" },
];

const weekdays = [
  { id: "mon", label: "月", day: 1 },
  { id: "tue", label: "火", day: 2 },
  { id: "wed", label: "水", day: 3 },
  { id: "thu", label: "木", day: 4 },
  { id: "fri", label: "金", day: 5 },
  { id: "sat", label: "土", day: 6 },
  { id: "sun", label: "日", day: 0 },
];

const returnTypes = {
  normal: { label: "通常", time: "16:30", earliest: "16:30", latest: "17:00" },
  early: { label: "13:30帰り", time: "13:30", earliest: "13:30", latest: "14:00" },
};

const serviceTypes = {
  morning: { label: "朝の送迎", shortLabel: "朝迎え", actionLabel: "迎え", defaultStartTime: "08:30" },
  evening: { label: "夕方の送迎", shortLabel: "夕方送り", actionLabel: "送り", defaultStartTime: "16:30" },
};

const finalReviewLoginUsers = [
  { id: "review_admin", name: "管理者", permission: "admin", pin: "0000", color: "#0b72d9" },
  { id: "review_dispatcher", name: "配車担当", permission: "staff", pin: "1111", color: "#098a65" },
  { id: "review_driver", name: "ドライバー", permission: "viewer", pin: "2222", color: "#6f7b88" },
];

const knownLocations = [
  { key: "大師町10-6", aliases: ["大師町10番6", "アイスタッフ大師", "アイスタッフケアステーション大師"], lat: 35.5338309, lon: 139.7306612 },
  { key: "川崎区役所", aliases: ["区役所", "東田町8"], lat: 35.53082, lon: 139.70306 },
  { key: "川崎駅", aliases: ["JR川崎駅", "JR川崎"], lat: 35.5302136, lon: 139.6973611 },
  { key: "京急川崎駅", aliases: ["京急川崎", "京浜急行川崎駅", "京浜急行川崎"], lat: 35.53283, lon: 139.7007815 },
  { key: "八丁畷駅", aliases: ["八丁畷"], lat: 35.5230147, lon: 139.6917276 },
  { key: "川崎新町駅", aliases: ["川崎新町"], lat: 35.5182574, lon: 139.6991819 },
  { key: "小田栄駅", aliases: ["小田栄"], lat: 35.5146193, lon: 139.7048669 },
  { key: "浜川崎駅", aliases: ["浜川崎"], lat: 35.5103253, lon: 139.7137564 },
  { key: "武蔵白石駅", aliases: ["武蔵白石"], lat: 35.5018116, lon: 139.7062924 },
  { key: "安善駅", aliases: ["安善"], lat: 35.4997193, lon: 139.7010367 },
  { key: "扇町駅", aliases: ["扇町"], lat: 35.5012754, lon: 139.7222348 },
  { key: "昭和駅", aliases: ["昭和"], lat: 35.5064693, lon: 139.7240507 },
  { key: "大川駅", aliases: ["大川"], lat: 35.4957, lon: 139.7119 },
  { key: "港町駅", aliases: ["港町"], lat: 35.5350326, lon: 139.7124679 },
  { key: "鈴木町駅", aliases: ["鈴木町"], lat: 35.5354136, lon: 139.7206509 },
  { key: "川崎大師駅", aliases: ["川崎大師", "大師駅"], lat: 35.53474, lon: 139.72575 },
  { key: "東門前駅", aliases: ["東門前"], lat: 35.5365833, lon: 139.7343911 },
  { key: "大師橋駅", aliases: ["大師橋", "産業道路駅", "産業道路"], lat: 35.5366217, lon: 139.7405764 },
  { key: "小島新田駅", aliases: ["小島新田"], lat: 35.5347674, lon: 139.7479108 },
  { key: "大師公園", aliases: ["川崎大師公園"], lat: 35.53591, lon: 139.73007 },
  { key: "川崎大師平間寺", aliases: ["平間寺"], lat: 35.5342515, lon: 139.7294416 },
  { key: "川崎市立川崎病院", aliases: ["市立川崎病院", "市立病院", "川崎病院"], lat: 35.52922, lon: 139.70753 },
  { key: "総合川崎臨港病院", aliases: ["臨港病院", "川崎臨港病院", "臨港", "キノメディッククリニック川崎"], lat: 35.526127, lon: 139.717514 },
  { key: "AOI国際病院", aliases: ["AＯI国際病院", "ＡＯＩ国際病院", "aoi国際病院", "エーオーアイ国際病院", "AOI健康管理センター"], lat: 35.533916, lon: 139.746048 },
  { key: "日本鋼管病院", aliases: ["鋼管病院", "こうかん病院", "鋼管"], lat: 35.519604, lon: 139.71225 },
  { key: "こうかんクリニック", aliases: ["鋼管クリニック", "こうかん"], lat: 35.519604, lon: 139.71225 },
  { key: "太田総合病院", aliases: ["太田病院", "太田総合", "太田"], lat: 35.528065, lon: 139.695099 },
  { key: "川崎協同病院", aliases: ["協同病院", "川崎協同", "協同", "川崎医療生活協同組合川崎協同病院"], lat: 35.521923, lon: 139.721725 },
  { key: "宮川病院", aliases: ["誠医会宮川病院", "宮川"], lat: 35.534908, lon: 139.725006 },
  { key: "川崎市川崎休日急患診療所", aliases: ["川崎休日急患診療所", "川崎区休日急患診療所", "休日急患診療所", "休日診療"], lat: 35.529778, lon: 139.71022 },
  { key: "大師診療所", aliases: ["川崎医療生活協同組合大師診療所", "大師診療"], lat: 35.533764, lon: 139.730789 },
  { key: "川崎競馬場", aliases: ["競馬場"], lat: 35.53298, lon: 139.70933 },
];

const els = {
  securityPanel: document.getElementById("securityPanel"),
  securityTitle: document.getElementById("securityTitle"),
  securityStatus: document.getElementById("securityStatus"),
  securityChecklist: document.getElementById("securityChecklist"),
  loginForm: document.getElementById("loginForm"),
  loginUserSelect: document.getElementById("loginUserSelect"),
  loginPin: document.getElementById("loginPin"),
  sessionActions: document.getElementById("sessionActions"),
  sessionUserName: document.getElementById("sessionUserName"),
  logoutButton: document.getElementById("logoutButton"),
  appTabs: document.querySelectorAll("[data-app-tab]"),
  appPanels: document.querySelectorAll("[data-app-panel]"),
  startAddress: document.getElementById("startAddress"),
  endAddress: document.getElementById("endAddress"),
  startTime: document.getElementById("startTime"),
  serviceType: document.getElementById("serviceType"),
  useLocationButton: document.getElementById("useLocationButton"),
  useNowTime: document.getElementById("useNowTime"),
  vehicleGrid: document.getElementById("vehicleGrid"),
  serviceDate: document.getElementById("serviceDate"),
  refreshTodayRosterButton: document.getElementById("refreshTodayRosterButton"),
  extraTodayPatientSelect: document.getElementById("extraTodayPatientSelect"),
  addExtraTodayPatientButton: document.getElementById("addExtraTodayPatientButton"),
  todayRosterList: document.getElementById("todayRosterList"),
  applyTodayRosterButton: document.getElementById("applyTodayRosterButton"),
  patientForm: document.getElementById("patientForm"),
  registeredPatientSelect: document.getElementById("registeredPatientSelect"),
  registeredPatientNameList: document.getElementById("registeredPatientNameList"),
  patientName: document.getElementById("patientName"),
  patientAddress: document.getElementById("patientAddress"),
  patientPassengers: document.getElementById("patientPassengers"),
  patientEarliest: document.getElementById("patientEarliest"),
  patientLatest: document.getElementById("patientLatest"),
  patientWheelchair: document.getElementById("patientWheelchair"),
  patientNote: document.getElementById("patientNote"),
  autoAssignVehiclesButton: document.getElementById("autoAssignVehiclesButton"),
  clearPatientsButton: document.getElementById("clearPatientsButton"),
  patientList: document.getElementById("patientList"),
  registryForm: document.getElementById("registryForm"),
  registryName: document.getElementById("registryName"),
  registryAddress: document.getElementById("registryAddress"),
  registryPassengers: document.getElementById("registryPassengers"),
  registryEarliest: document.getElementById("registryEarliest"),
  registryLatest: document.getElementById("registryLatest"),
  registryWheelchair: document.getElementById("registryWheelchair"),
  registryNote: document.getElementById("registryNote"),
  registrySubmitButton: document.getElementById("registrySubmitButton"),
  registryCancelEditButton: document.getElementById("registryCancelEditButton"),
  weekdayEnabledInputs: document.querySelectorAll("[data-weekday-enabled]"),
  weekdayReturnSelects: document.querySelectorAll("[data-weekday-return]"),
  importPatientsButton: document.getElementById("importPatientsButton"),
  clearRegistryFormButton: document.getElementById("clearRegistryFormButton"),
  registryList: document.getElementById("registryList"),
  bulkImportText: document.getElementById("bulkImportText"),
  bulkImportFile: document.getElementById("bulkImportFile"),
  bulkAddToRoute: document.getElementById("bulkAddToRoute"),
  bulkTemplateButton: document.getElementById("bulkTemplateButton"),
  bulkPreviewButton: document.getElementById("bulkPreviewButton"),
  bulkCommitButton: document.getElementById("bulkCommitButton"),
  bulkImportPreview: document.getElementById("bulkImportPreview"),
  optimizeButton: document.getElementById("optimizeButton"),
  autoRefreshButton: document.getElementById("autoRefreshButton"),
  googleMapsButton: document.getElementById("googleMapsButton"),
  dispatchSheetPanel: document.getElementById("dispatchSheetPanel"),
  dispatchSheetBody: document.getElementById("dispatchSheetBody"),
  copyDispatchSheetButton: document.getElementById("copyDispatchSheetButton"),
  downloadDispatchCsvButton: document.getElementById("downloadDispatchCsvButton"),
  printDispatchSheetButton: document.getElementById("printDispatchSheetButton"),
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
let lastRouteOrderedPatients = [];
let lastGoogleMapsUrl = "";
let autoRefreshTimer = null;
let editingRegistryId = null;
let backendAvailable = false;
let sessionToken = sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
let currentUser = null;
let careRole = "review";
let pendingBulkPatients = [];
let lastAutofilledPatientId = "";
const geocodeCache = new Map();

boot();

async function boot() {
  renderVehicles();
  bindEvents();
  initMap();
  syncInputsFromState();
  renderAppTabs();
  renderPatients();
  renderRegisteredPatients();
  renderTodayRoster();
  renderDispatchSheet();
  syncAutoRefresh();
  await initSecureBackend();
}

function bindEvents() {
  els.vehicleGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vehicle]");
    if (!button) return;
    if (button.disabled) {
      setStatus("車いす利用者がいる場合は、1号車または2号車のみ選択できます。", true);
      return;
    }
    state.vehicleId = button.dataset.vehicle;
    persist();
    renderVehicles();
    renderPatients();
    renderDispatchSheet();
  });

  [els.startAddress, els.endAddress, els.startTime].forEach((input) => {
    input.addEventListener("input", () => {
      state.startAddress = els.startAddress.value.trim();
      state.endAddress = els.endAddress.value.trim();
      state.startTime = els.startTime.value || "08:30";
      persist();
      renderDispatchSheet();
      if (!lastRouteBounds && state.activeAppTab === "map") {
        focusStartAddressOnMap();
      }
    });
  });
  els.serviceType.addEventListener("change", () => {
    const previousDefault = getServiceTypeConfig(state.serviceType).defaultStartTime;
    state.serviceType = normalizeServiceType(els.serviceType.value);
    if (!els.startTime.value || els.startTime.value === previousDefault) {
      state.startTime = getServiceTypeConfig(state.serviceType).defaultStartTime;
      els.startTime.value = state.startTime;
    }
    persist();
    renderDispatchSheet();
  });
  els.useNowTime.addEventListener("change", () => {
    state.useNowTime = els.useNowTime.checked;
    persist();
  });
  els.serviceDate.addEventListener("change", () => {
    state.serviceDate = els.serviceDate.value || getTodayIsoDate();
    persist();
    void loadDailyPlanForDate(state.serviceDate);
  });
  els.refreshTodayRosterButton.addEventListener("click", () => {
    void loadDailyPlanForDate(state.serviceDate || getTodayIsoDate());
  });
  els.todayRosterList.addEventListener("change", handleTodayRosterChange);
  els.todayRosterList.addEventListener("input", handleTodayRosterInput);
  els.todayRosterList.addEventListener("click", handleTodayRosterClick);
  els.addExtraTodayPatientButton.addEventListener("click", addExtraTodayPatient);
  els.applyTodayRosterButton.addEventListener("click", applyTodayRosterToRoute);
  els.registeredPatientSelect.addEventListener("change", () => {
    applyRegisteredPatientToForm(els.registeredPatientSelect.value, { status: true });
  });
  els.patientName.addEventListener("input", handlePatientNameInput);
  els.patientWheelchair.addEventListener("change", () => {
    ensureVehicleCompatibility({ status: true });
    renderVehicles();
  });

  els.patientForm.addEventListener("submit", addPatient);
  els.registryForm.addEventListener("submit", saveRegisteredPatient);
  els.registryList.addEventListener("click", handleRegisteredPatientAction);
  els.importPatientsButton.addEventListener("click", registerCurrentPatients);
  els.clearRegistryFormButton.addEventListener("click", resetRegistryForm);
  els.registryCancelEditButton.addEventListener("click", resetRegistryForm);
  els.weekdayEnabledInputs.forEach((input) => input.addEventListener("change", syncWeeklyScheduleSelects));
  els.autoAssignVehiclesButton.addEventListener("click", autoAssignVehicles);
  els.bulkTemplateButton.addEventListener("click", copyBulkTemplate);
  els.bulkPreviewButton.addEventListener("click", previewBulkImport);
  els.bulkCommitButton.addEventListener("click", commitBulkImport);
  els.bulkImportText.addEventListener("input", () => {
    pendingBulkPatients = [];
    els.bulkCommitButton.disabled = true;
    syncRegisteredPatientInputs();
  });
  els.bulkImportFile.addEventListener("change", loadBulkImportFile);
  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutButton.addEventListener("click", logout);
  els.appTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeAppTab = tab.dataset.appTab;
      persist();
      renderAppTabs();
    });
  });
  els.clearPatientsButton.addEventListener("click", clearPatients);
  els.patientList.addEventListener("click", removePatient);
  els.patientList.addEventListener("change", handlePatientListChange);
  els.patientList.addEventListener("input", handlePatientListInput);
  els.useLocationButton.addEventListener("click", useCurrentLocationAsStart);
  els.optimizeButton.addEventListener("click", optimizeRoute);
  els.autoRefreshButton.addEventListener("click", toggleAutoRefresh);
  els.googleMapsButton.addEventListener("click", openGoogleMapsRoute);
  els.copyDispatchSheetButton.addEventListener("click", copyDispatchSheet);
  els.downloadDispatchCsvButton.addEventListener("click", downloadDispatchCsv);
  els.printDispatchSheetButton.addEventListener("click", printDispatchSheet);
  els.fitMapButton.addEventListener("click", fitRouteBounds);
  window.addEventListener("beforeunload", () => window.clearInterval(autoRefreshTimer));
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([BASE_LOCATION.lat, BASE_LOCATION.lon], INITIAL_MAP_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  focusStartAddressOnMap();
}

function renderVehicles() {
  ensureVehicleCompatibility();
  const wheelchairRequired = isWheelchairVehicleRequired();
  els.vehicleGrid.innerHTML = vehicles.map((vehicle) => `
    <button class="vehicle-card ${vehicle.id === state.vehicleId ? "active" : ""} ${wheelchairRequired && !vehicle.wheelchair ? "disabled" : ""}" type="button" data-vehicle="${escapeHtml(vehicle.id)}" ${wheelchairRequired && !vehicle.wheelchair ? "disabled" : ""}>
      <strong>${escapeHtml(vehicle.name)}</strong>
      <span>座席 ${vehicle.capacity}名${vehicle.wheelchair ? ` / 車いす${vehicle.wheelchairCapacity}台` : " / 車いす不可"}</span>
      <span>${wheelchairRequired && !vehicle.wheelchair ? "車いす利用者がいるため選択不可" : escapeHtml(vehicle.note)}</span>
    </button>
  `).join("");
}

function syncInputsFromState() {
  els.startAddress.value = state.startAddress;
  els.endAddress.value = state.endAddress;
  els.startTime.value = state.startTime;
  els.serviceType.value = normalizeServiceType(state.serviceType);
  els.useNowTime.checked = state.useNowTime !== false;
  els.serviceDate.value = state.serviceDate || getTodayIsoDate();
}

async function initSecureBackend() {
  try {
    const config = await apiFetch("/api/care-route/public-config", { auth: false });
    backendAvailable = Boolean(config.backend);
    renderSecurityPanel(config.security);
    renderLoginUsers(config.users || []);
    if (sessionToken) {
      await loadSecureSession();
    } else {
      lockAppForLogin();
    }
  } catch {
    backendAvailable = false;
    renderFinalReviewSecurityPanel();
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const hasBody = options.body !== undefined;
  if (hasBody) headers["Content-Type"] = "application/json";
  if (options.auth !== false && sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!response.ok) {
    throw new Error(data.error || "通信に失敗しました。");
  }
  return data;
}

function getCareRoleLabel(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : getCareRoleFromUser(userOrRole);
  if (role === "admin") return "管理者";
  if (role === "dispatcher") return "配車担当";
  if (role === "driver") return "ドライバー";
  return "確認";
}

function getCareRoleFromUser(user) {
  if (user?.permission === "admin") return "admin";
  if (user?.permission === "viewer") return "driver";
  if (user?.permission === "staff") return "dispatcher";
  return "review";
}

function logCareRouteAction(action, detail, targetType = "care-route", targetId = "") {
  if (!backendAvailable || !currentUser) return;
  apiFetch("/api/care-route/audit", {
    method: "POST",
    body: { action, detail, targetType, targetId },
  }).catch(() => {});
}

function renderSecurityPanel(security) {
  els.securityPanel.hidden = false;
  els.securityTitle.textContent = security?.production ? "本番ログイン" : "本番確認ログイン";
  const keyStatus = security?.encryptionKeyConfigured ? "暗号キー設定済み" : "暗号キー未設定";
  const modeStatus = security?.production ? "本番運用モード" : "本番確認モード";
  const ttlText = security?.sessionTtlHours ? `セッション${security.sessionTtlHours}時間` : "期限付きセッション";
  els.securityStatus.textContent = `${modeStatus} / ログイン必須 / 権限管理 / 操作ログ / 暗号化保存 / ${ttlText}（${keyStatus}）`;
  els.securityChecklist.innerHTML = security?.production && security?.encryptionKeyConfigured ? `
    <div class="security-item"><span class="security-mark">OK</span><span>本番データ入力可: 本番暗号キー、ログイン制限、権限管理、暗号化保存、バックアップが有効です。</span></div>
    <div class="security-item"><span class="security-mark">OK</span><span>画面を閉じると、ルート作成中の患者名・住所はブラウザ保存に残さない設計です。</span></div>
  ` : `
    <div class="security-item warning"><span class="security-mark">!</span><span>本番データ入力前に NODE_ENV=production、CARE_ROUTE_DATA_KEY、LOGIN_PINS を設定してください。</span></div>
    <div class="security-item"><span class="security-mark">OK</span><span>ログイン、権限管理、暗号化保存、バックアップの動作確認はできます。</span></div>
  `;
  els.loginForm.hidden = false;
  els.sessionActions.hidden = true;
}

function renderFinalReviewSecurityPanel() {
  els.securityPanel.hidden = false;
  els.securityTitle.textContent = "本番確認ログイン";
  els.securityStatus.textContent = "ログイン後、送迎登録・顧客登録・ルート作成を確認できます。";
  els.securityChecklist.innerHTML = `
    <div class="security-item"><span class="security-mark">OK</span><span>利用者名、住所、時間制約、車いす利用の登録画面を本番運用の項目に合わせています。</span></div>
    <div class="security-item"><span class="security-mark">OK</span><span>本番サーバー接続時はログイン、権限、暗号化保存、バックアップで運用します。</span></div>
  `;
  renderLoginUsers(finalReviewLoginUsers);
  const reviewUser = finalReviewLoginUsers.find((user) => user.id === sessionStorage.getItem(REVIEW_SESSION_STORAGE_KEY));
  if (reviewUser) {
    applyLocalSession(reviewUser);
    return;
  }
  lockAppForLogin("ログインしてください。");
}

function renderLoginUsers(users) {
  els.loginUserSelect.innerHTML = users.map((user) => `
    <option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} / ${escapeHtml(getCareRoleLabel(user))}</option>
  `).join("");
}

async function loadSecureSession() {
  try {
    const session = await apiFetch("/api/care-route/session");
    currentUser = session.user;
    careRole = session.careRole || "dispatcher";
    els.loginForm.hidden = true;
    els.sessionActions.hidden = false;
    els.sessionUserName.textContent = `${currentUser.name} / ${getCareRoleLabel(careRole)}`;
    await loadSecureCareRouteState();
    applyCareRolePermissions();
    setStatus("ログインしました。");
  } catch {
    sessionToken = "";
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    currentUser = null;
    careRole = "review";
    lockAppForLogin();
  }
}

function lockAppForLogin(message = "ログインしてください。") {
  els.loginForm.hidden = false;
  els.sessionActions.hidden = true;
  if (backendAvailable || !currentUser) {
    state.patients = [];
    state.registeredPatients = [];
    renderPatients();
    renderRegisteredPatients();
    renderTodayRoster();
    renderDispatchSheet();
    persist();
  }
  setAppInteractive(false);
  setStatus(message, true);
}

function setAppInteractive(enabled) {
  [
    els.patientForm,
    els.registryForm,
  ].forEach((form) => {
    form.querySelectorAll("input, select, button").forEach((element) => {
      element.disabled = !enabled;
    });
  });
  [
    els.useLocationButton,
    els.refreshTodayRosterButton,
    els.addExtraTodayPatientButton,
    els.applyTodayRosterButton,
    els.autoAssignVehiclesButton,
    els.clearPatientsButton,
    els.optimizeButton,
    els.autoRefreshButton,
    els.importPatientsButton,
    els.clearRegistryFormButton,
    els.bulkTemplateButton,
    els.bulkPreviewButton,
    els.bulkCommitButton,
    els.copyDispatchSheetButton,
    els.downloadDispatchCsvButton,
    els.printDispatchSheetButton,
  ].forEach((button) => {
    if (button) button.disabled = !enabled;
  });
  [els.serviceType, els.serviceDate, els.extraTodayPatientSelect, els.bulkImportText, els.bulkImportFile, els.bulkAddToRoute].forEach((element) => {
    if (element) element.disabled = !enabled;
  });
  if (!enabled) els.googleMapsButton.disabled = true;
}

async function loadSecureCareRouteState() {
  const data = await apiFetch("/api/care-route/state");
  state.registeredPatients = Array.isArray(data.customers) ? data.customers : [];
  persist();
  renderRegisteredPatients();
  syncRegisteredPatientInputs();
  await loadDailyPlanForDate(state.serviceDate || getTodayIsoDate(), { silent: true });
}

function applyCareRolePermissions() {
  setAppInteractive(true);
  const canEdit = canEditCustomers();
  els.registryForm.querySelectorAll("input, select, button").forEach((element) => {
    element.disabled = !canEdit;
  });
  els.importPatientsButton.disabled = !canEdit;
  els.clearRegistryFormButton.disabled = !canEdit;
  [els.bulkImportText, els.bulkImportFile, els.bulkAddToRoute, els.bulkTemplateButton, els.bulkPreviewButton, els.bulkCommitButton].forEach((element) => {
    element.disabled = !canEdit || (element === els.bulkCommitButton && pendingBulkPatients.length === 0);
  });
}

function canEditCustomers() {
  return careRole !== "driver" && (!backendAvailable || ["admin", "dispatcher"].includes(careRole));
}

function applyLocalSession(user) {
  currentUser = {
    id: user.id,
    name: user.name,
    permission: user.permission,
    color: user.color,
  };
  careRole = getCareRoleFromUser(user);
  els.loginForm.hidden = true;
  els.sessionActions.hidden = false;
  els.sessionUserName.textContent = `${currentUser.name} / ${getCareRoleLabel(careRole)}`;
  applyCareRolePermissions();
  renderRegisteredPatients();
  renderTodayRoster();
  setStatus("ログインしました。");
}

async function handleLogin(event) {
  event.preventDefault();
  const userId = els.loginUserSelect.value;
  const pin = els.loginPin.value;

  if (!backendAvailable) {
    const reviewUser = finalReviewLoginUsers.find((user) => user.id === userId && user.pin === String(pin || ""));
    if (!reviewUser) {
      setStatus("PINが正しくありません。", true);
      return;
    }
    sessionStorage.setItem(REVIEW_SESSION_STORAGE_KEY, reviewUser.id);
    els.loginPin.value = "";
    applyLocalSession(reviewUser);
    return;
  }

  try {
    const result = await apiFetch("/api/login", {
      auth: false,
      method: "POST",
      body: { userId, pin },
    });
    sessionToken = result.token;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
    els.loginPin.value = "";
    await loadSecureSession();
  } catch (error) {
    setStatus(error.message || "ログインに失敗しました。", true);
  }
}

function logout() {
  if (backendAvailable && sessionToken) {
    apiFetch("/api/logout", { method: "POST" }).catch(() => {});
  }
  sessionToken = "";
  currentUser = null;
  careRole = "review";
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(REVIEW_SESSION_STORAGE_KEY);
  lockAppForLogin("ログインしてください。");
}

function renderAppTabs() {
  const activeTab = ["plan", "map", "customers"].includes(state.activeAppTab) ? state.activeAppTab : "plan";
  els.appTabs.forEach((tab) => {
    const isActive = tab.dataset.appTab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  els.appPanels.forEach((panel) => {
    const isActive = panel.dataset.appPanel === activeTab;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));

  if (activeTab === "map") {
    window.setTimeout(() => {
      map.invalidateSize();
      fitRouteBounds();
    }, 80);
  }
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
    note: els.patientNote.value.trim(),
    assignedVehicleId: getCompatibleVehicleId(els.patientWheelchair.checked ? "car1" : state.vehicleId, els.patientWheelchair.checked),
  };

  if (!patient.name || !patient.address) {
    setStatus("お名前と住所を入力してください。", true);
    return;
  }

  const changedVehicle = patient.wheelchair ? ensureVehicleCompatibilityForPatient(patient, { status: true }) : false;
  state.patients.push(patient);
  persist();
  els.patientForm.reset();
  els.registeredPatientSelect.value = "";
  els.patientPassengers.value = "1";
  lastAutofilledPatientId = "";
  renderVehicles();
  renderPatients();
  renderDispatchSheet();
  setStatus(changedVehicle ? "車いす利用者のため、1号車または2号車に切り替えて追加しました。" : "患者様を追加しました。");
}

function removePatient(event) {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.patients = state.patients.filter((patient) => patient.id !== button.dataset.remove);
  persist();
  renderVehicles();
  renderPatients();
  renderDispatchSheet();
  setStatus("患者様を削除しました。");
}

function clearPatients() {
  state.patients = [];
  persist();
  renderVehicles();
  renderPatients();
  clearRoute();
  renderDispatchSheet();
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
  const wheelchairCount = getWheelchairCount();
  const seatedPassengers = getSeatedPassengers();
  normalizePatientVehicleAssignments();

  if (!state.patients.length) {
    els.patientList.innerHTML = `<div class="patient-card"><div><strong>今日の送迎対象は未登録です</strong><span>住所と時間制約を入力するか、患者さま登録から呼び出してください。</span></div></div>`;
    renderDispatchSheet();
    return;
  }

  els.patientList.innerHTML = `
    <div class="patient-card">
      <div>
        <strong>合計 ${totalPassengers}名 / ${vehicle.name}</strong>
        <span>座席 ${seatedPassengers}/${vehicle.capacity}名・車いす ${wheelchairCount}/${vehicle.wheelchairCapacity || 0}台 / ${getCapacityMessage(vehicle)}</span>
        <span>${escapeHtml(formatVehicleAssignmentSummary())}</span>
      </div>
    </div>
    ${state.patients.map((patient) => `
      <article class="patient-card">
        <div>
          <strong>${escapeHtml(patient.name)} ${patient.wheelchair ? "・車いす" : ""}</strong>
          <span>${escapeHtml(patient.address)}</span>
          <span>${escapeHtml(formatWindow(patient))} / ${patient.passengers}名</span>
          <div class="patient-card-controls">
            <label>
              <span>配車車両</span>
              <select data-patient-vehicle="${escapeHtml(patient.id)}">
                ${vehicles.map((vehicleItem) => `
                  <option value="${escapeHtml(vehicleItem.id)}" ${getAssignedVehicle(patient).id === vehicleItem.id ? "selected" : ""} ${patient.wheelchair && !vehicleItem.wheelchair ? "disabled" : ""}>${escapeHtml(vehicleItem.name)}</option>
                `).join("")}
              </select>
            </label>
            <label>
              <span>配車表の備考</span>
              <textarea rows="2" data-patient-note="${escapeHtml(patient.id)}" placeholder="ドライバーへ伝える内容">${escapeHtml(patient.note || "")}</textarea>
            </label>
          </div>
        </div>
        <button class="remove-button" type="button" data-remove="${escapeHtml(patient.id)}">削除</button>
      </article>
    `).join("")}
  `;
  renderDispatchSheet();
}

function renderRegisteredPatients() {
  const canEdit = canEditCustomers();
  const registeredPatients = careRole === "driver"
    ? []
    : [...state.registeredPatients].sort((a, b) => a.name.localeCompare(b.name, "ja"));

  syncRegisteredPatientInputs(registeredPatients);
  syncExtraTodayPatientSelect(registeredPatients);

  if (!registeredPatients.length) {
    els.registryList.innerHTML = `
      <div class="patient-card">
        <div>
          <strong>登録済み患者さまはまだありません</strong>
          <span>よく利用する患者さまを登録すると、次回から「呼び出す」だけで今日の送迎に追加できます。</span>
        </div>
      </div>
    `;
    renderTodayRoster();
    return;
  }

  els.registryList.innerHTML = `
    <div class="patient-card">
      <div>
        <strong>登録済み ${registeredPatients.length}名</strong>
        <span>「呼び出す」で今日の送迎対象に追加します。</span>
      </div>
    </div>
    ${registeredPatients.map((patient) => `
      <article class="patient-card registry-card">
        <div>
          <strong>${escapeHtml(patient.name)} ${patient.wheelchair ? "・車いす" : ""}</strong>
          <span>${escapeHtml(patient.address)}</span>
          <span>${escapeHtml(formatWindow(patient))} / ${patient.passengers}名</span>
          <span>${escapeHtml(formatWeeklyScheduleSummary(patient.weeklySchedule))}</span>
          ${patient.note ? `<span>備考: ${escapeHtml(patient.note)}</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="call-button" type="button" data-call-registry="${escapeHtml(patient.id)}">呼び出す</button>
          ${canEdit ? `
            <button class="edit-button" type="button" data-edit-registry="${escapeHtml(patient.id)}">編集</button>
            <button class="remove-button" type="button" data-delete-registry="${escapeHtml(patient.id)}">削除</button>
          ` : ""}
        </div>
      </article>
    `).join("")}
  `;
  renderTodayRoster();
}

function syncRegisteredPatientInputs(list = null) {
  const registeredPatients = getSelectableRegisteredPatients(list);
  const currentValue = els.registeredPatientSelect.value;

  els.registeredPatientSelect.innerHTML = `
    <option value="">直接入力する</option>
    ${registeredPatients.map((patient) => `
      <option value="${escapeHtml(patient.id)}">${escapeHtml(buildRegisteredPatientOptionLabel(patient))}</option>
    `).join("")}
  `;
  els.registeredPatientSelect.value = registeredPatients.some((patient) => patient.id === currentValue) ? currentValue : "";
  els.registeredPatientSelect.disabled = registeredPatients.length === 0 || !currentUser;
  els.registeredPatientNameList.innerHTML = registeredPatients.map((patient) => `
    <option value="${escapeHtml(patient.name)}">${escapeHtml(patient.address)}</option>
  `).join("");
}

function buildRegisteredPatientOptionLabel(patient) {
  const status = patient.isPendingImport ? " / 登録前" : "";
  return `${patient.name}${patient.wheelchair ? " / 車いす" : ""}${status} / ${patient.address}`;
}

function getSelectableRegisteredPatients(list = null) {
  if (careRole === "driver") return [];
  const registeredPatients = list || [...state.registeredPatients].sort(comparePatientNames);
  if (!pendingBulkPatients.length) return registeredPatients;

  const seen = new Set(registeredPatients.map((patient) => getPatientRecordKey(patient)));
  const pendingPatients = pendingBulkPatients
    .filter((patient) => !seen.has(getPatientRecordKey(patient)))
    .map((patient) => ({ ...patient, isPendingImport: true }));
  return [...registeredPatients, ...pendingPatients].sort(comparePatientNames);
}

function getRegisteredPatientById(patientId) {
  return state.registeredPatients.find((item) => item.id === patientId) ||
    pendingBulkPatients.find((item) => item.id === patientId) ||
    null;
}

function comparePatientNames(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), "ja");
}

function getPatientRecordKey(patient) {
  return `${normalizeText(patient?.name)}:${normalizeText(patient?.address)}`;
}

function handlePatientListChange(event) {
  const vehicleSelect = event.target.closest("[data-patient-vehicle]");
  if (!vehicleSelect) return;
  const patient = state.patients.find((item) => item.id === vehicleSelect.dataset.patientVehicle);
  if (!patient) return;
  const nextVehicleId = getCompatibleVehicleId(vehicleSelect.value, Boolean(patient.wheelchair));
  patient.assignedVehicleId = nextVehicleId;
  vehicleSelect.value = nextVehicleId;
  persist();
  renderPatients();
  renderDispatchSheet();
}

function handlePatientListInput(event) {
  const noteInput = event.target.closest("[data-patient-note]");
  if (!noteInput) return;
  const patient = state.patients.find((item) => item.id === noteInput.dataset.patientNote);
  if (!patient) return;
  patient.note = noteInput.value.trim();
  persist();
  renderDispatchSheet();
}

function autoAssignVehicles() {
  if (!state.patients.length) {
    setStatus("送迎対象がいないため、車両割当はできません。", true);
    return;
  }

  const usage = new Map(vehicles.map((vehicle) => [vehicle.id, { seated: 0, wheelchair: 0 }]));
  const sortedPatients = [...state.patients].sort((a, b) => Number(Boolean(b.wheelchair)) - Number(Boolean(a.wheelchair)));

  sortedPatients.forEach((patient) => {
    const targetVehicle = vehicles.find((vehicle) => {
      if (patient.wheelchair && !vehicle.wheelchair) return false;
      const current = usage.get(vehicle.id);
      const nextWheelchair = current.wheelchair + (patient.wheelchair ? 1 : 0);
      const nextSeated = current.seated + (patient.wheelchair ? 0 : Number(patient.passengers || 1));
      return nextWheelchair <= (vehicle.wheelchairCapacity || 0) && nextSeated <= vehicle.capacity;
    }) || vehicles.find((vehicle) => patient.wheelchair ? vehicle.wheelchair : true) || vehicles[0];

    patient.assignedVehicleId = targetVehicle.id;
    const current = usage.get(targetVehicle.id);
    current.wheelchair += patient.wheelchair ? 1 : 0;
    current.seated += patient.wheelchair ? 0 : Number(patient.passengers || 1);
  });

  persist();
  renderPatients();
  renderDispatchSheet();
  setStatus("定員と車いす条件を見ながら、車両を自動割当しました。");
}

function normalizePatientVehicleAssignments() {
  state.patients.forEach((patient) => {
    patient.assignedVehicleId = getCompatibleVehicleId(patient.assignedVehicleId || state.vehicleId, Boolean(patient.wheelchair));
  });
}

function getCompatibleVehicleId(vehicleId, wheelchairRequired = false) {
  const fallback = wheelchairRequired ? vehicles.find((vehicle) => vehicle.wheelchair) : getVehicle();
  const requested = vehicles.find((vehicle) => vehicle.id === vehicleId);
  if (!requested) return fallback?.id || vehicles[0].id;
  if (wheelchairRequired && !requested.wheelchair) return fallback?.id || vehicles[0].id;
  return requested.id;
}

function getAssignedVehicle(patient) {
  return vehicles.find((vehicle) => vehicle.id === getCompatibleVehicleId(patient.assignedVehicleId, Boolean(patient.wheelchair))) || vehicles[0];
}

function formatVehicleAssignmentSummary() {
  const groups = groupPatientsByVehicle();
  const parts = vehicles
    .map((vehicle) => {
      const patients = groups.get(vehicle.id) || [];
      if (!patients.length) return "";
      const seated = patients.reduce((sum, patient) => sum + (patient.wheelchair ? 0 : Number(patient.passengers || 1)), 0);
      const wheelchair = patients.filter((patient) => patient.wheelchair).length;
      return `${vehicle.name}: 座席${seated}/${vehicle.capacity}・車いす${wheelchair}/${vehicle.wheelchairCapacity || 0}`;
    })
    .filter(Boolean);
  return parts.length ? `配車割当 ${parts.join(" / ")}` : "配車割当 未設定";
}

function groupPatientsByVehicle() {
  normalizePatientVehicleAssignments();
  const groups = new Map(vehicles.map((vehicle) => [vehicle.id, []]));
  state.patients.forEach((patient) => {
    const vehicleId = getAssignedVehicle(patient).id;
    groups.get(vehicleId).push(patient);
  });
  return groups;
}

function renderDispatchSheet() {
  if (!els.dispatchSheetBody) return;
  const rows = buildDispatchRows();
  const hasRows = rows.length > 0;
  [els.copyDispatchSheetButton, els.downloadDispatchCsvButton, els.printDispatchSheetButton].forEach((button) => {
    if (button) button.disabled = !hasRows;
  });

  if (!hasRows) {
    els.dispatchSheetBody.innerHTML = `
      <div class="empty-result">
        <strong>配車表はまだ作成されていません</strong>
        <span>送迎対象を追加し、必要に応じて車両と備考を整えると、各車別の配車表を出力できます。</span>
      </div>
    `;
    return;
  }

  const service = getServiceTypeConfig(state.serviceType);
  const rowsByVehicle = groupDispatchRowsByVehicle(rows);
  els.dispatchSheetBody.innerHTML = vehicles.map((vehicle) => {
    const vehicleRows = rowsByVehicle.get(vehicle.id) || [];
    if (!vehicleRows.length) return "";
    return `
      <section class="dispatch-vehicle-sheet">
        <div class="dispatch-sheet-head">
          <div>
            <strong>${escapeHtml(vehicle.name)} / ${escapeHtml(service.shortLabel)}</strong>
            <span>${escapeHtml(state.serviceDate || getTodayIsoDate())} ${escapeHtml(state.startTime || service.defaultStartTime)} 出発 / ${vehicle.wheelchair ? `車いす${vehicle.wheelchairCapacity}台対応` : "座席車"}</span>
            <span>${escapeHtml(getVehicleOperationNote(vehicle, vehicleRows))}</span>
          </div>
          <span>${vehicleRows.length}件</span>
        </div>
        <div class="dispatch-table-wrap">
          <table class="dispatch-table">
            <thead>
              <tr><th>順番</th><th>目安</th><th>利用者</th><th>住所</th><th>人数</th><th>区分</th><th>乗車時注意</th><th>備考</th></tr>
            </thead>
            <tbody>
              ${vehicleRows.map((row) => `
                <tr>
                  <td>${row.order}</td>
                  <td>${escapeHtml(row.eta || "")}</td>
                  <td>${escapeHtml(row.name)}</td>
                  <td>${escapeHtml(row.address)}</td>
                  <td>${escapeHtml(row.passengers)}</td>
                  <td>${escapeHtml(row.wheelchair ? "車いす" : service.actionLabel)}</td>
                  <td>${escapeHtml(row.boardingNote)}</td>
                  <td>${escapeHtml(row.note || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");
}

function buildDispatchRows() {
  if (!state.patients.length) return [];
  normalizePatientVehicleAssignments();
  const service = getServiceTypeConfig(state.serviceType);
  const orderMap = new Map(lastRouteOrderedPatients.map((patient, index) => [patient.id, { order: index + 1, eta: patient.eta ? formatMinutes(patient.eta) : "" }]));
  const latestById = new Map(state.patients.map((patient) => [patient.id, patient]));
  const source = lastRouteOrderedPatients.length
    ? lastRouteOrderedPatients.map((patient) => ({ ...(latestById.get(patient.id) || patient), eta: patient.eta }))
    : [...state.patients];
  const sourceIds = new Set(source.map((patient) => patient.id));
  state.patients.forEach((patient) => {
    if (!sourceIds.has(patient.id)) source.push(patient);
  });

  return source.map((patient, index) => {
    const routeOrder = orderMap.get(patient.id);
    const assignedVehicle = getAssignedVehicle(patient);
    return {
      vehicleId: assignedVehicle.id,
      vehicleName: assignedVehicle.name,
      serviceType: state.serviceType,
      serviceLabel: service.label,
      order: routeOrder?.order || index + 1,
      eta: routeOrder?.eta || "",
      name: patient.name,
      address: patient.address,
      passengers: `${patient.passengers || 1}名`,
      wheelchair: Boolean(patient.wheelchair),
      note: patient.note || "",
      window: formatWindow(patient),
      boardingNote: getBoardingNote(patient, assignedVehicle),
    };
  }).sort((a, b) => {
    const vehicleIndex = vehicles.findIndex((vehicle) => vehicle.id === a.vehicleId) - vehicles.findIndex((vehicle) => vehicle.id === b.vehicleId);
    return vehicleIndex || a.order - b.order;
  });
}

function getBoardingNote(patient, vehicle) {
  if (patient.wheelchair) return "車いす固定位置・ベルト確認";
  if (vehicle.wheelchair) return "車いす仕様車の普通席利用";
  return "";
}

function getVehicleOperationNote(vehicle, vehicleRows) {
  if (!vehicle.wheelchair) return "通常座席運用";
  const wheelchairCount = vehicleRows.filter((row) => row.wheelchair).length;
  if (wheelchairCount > 0) return "車いす利用者を優先して固定位置と乗車順を確認";
  return "車いす利用者なし。車いす仕様車を普通席運用として使用";
}

function groupDispatchRowsByVehicle(rows) {
  const groups = new Map(vehicles.map((vehicle) => [vehicle.id, []]));
  rows.forEach((row) => {
    if (!groups.has(row.vehicleId)) groups.set(row.vehicleId, []);
    groups.get(row.vehicleId).push(row);
  });
  return groups;
}

async function copyDispatchSheet() {
  const text = buildDispatchSheetText("\t");
  if (!text) {
    setStatus("コピーできる配車表がありません。", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("各車別の配車表をコピーしました。Excelやスプレッドシートへ貼り付けできます。");
  } catch {
    setStatus("クリップボードへコピーできませんでした。CSV出力を使用してください。", true);
  }
}

function downloadDispatchCsv() {
  const csv = buildDispatchCsv();
  if (!csv) {
    setStatus("出力できる配車表がありません。", true);
    return;
  }
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `配車表_${state.serviceDate || getTodayIsoDate()}_${getServiceTypeConfig(state.serviceType).shortLabel}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("各車別の配車表CSVを出力しました。");
}

function printDispatchSheet() {
  window.print();
}

function buildDispatchCsv() {
  return buildDispatchSheetText(",", { csv: true });
}

function buildDispatchSheetText(delimiter, options = {}) {
  const rows = buildDispatchRows();
  if (!rows.length) return "";
  const service = getServiceTypeConfig(state.serviceType);
  const header = ["日付", "便区分", "出発予定", "車両", "順番", "到着目安", "利用者", "住所", "人数", "車いす", "時間指定", "乗車時注意", "備考"];
  const lines = [header];
  rows.forEach((row) => {
    lines.push([
      state.serviceDate || getTodayIsoDate(),
      service.label,
      state.startTime || service.defaultStartTime,
      row.vehicleName,
      row.order,
      row.eta,
      row.name,
      row.address,
      row.passengers,
      row.wheelchair ? "あり" : "なし",
      row.window,
      row.boardingNote,
      row.note || "",
    ]);
  });
  return lines.map((line) => line.map((cell) => options.csv ? escapeCsvCell(cell) : String(cell ?? "")).join(delimiter)).join("\n");
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function syncExtraTodayPatientSelect(list = null) {
  const registeredPatients = list || (careRole === "driver"
    ? []
    : [...state.registeredPatients].sort((a, b) => a.name.localeCompare(b.name, "ja")));
  const currentValue = els.extraTodayPatientSelect.value;
  els.extraTodayPatientSelect.innerHTML = `
    <option value="">登録済み顧客から選択</option>
    ${registeredPatients.map((patient) => `
      <option value="${escapeHtml(patient.id)}">${escapeHtml(patient.name)} / ${escapeHtml(patient.address)}</option>
    `).join("")}
  `;
  els.extraTodayPatientSelect.value = registeredPatients.some((patient) => patient.id === currentValue) ? currentValue : "";
  els.extraTodayPatientSelect.disabled = registeredPatients.length === 0 || !currentUser;
}

function renderTodayRoster() {
  if (!els.todayRosterList) return;
  const date = state.serviceDate || getTodayIsoDate();
  state.serviceDate = date;
  els.serviceDate.value = date;
  const weekday = getWeekdayForDate(date);
  const plan = getDailyPlan(date);
  const entries = getTodayRosterEntries(date);
  const scheduledCount = state.registeredPatients.filter((patient) => normalizeWeeklySchedule(patient.weeklySchedule)[weekday.id]).length;

  if (!currentUser) {
    els.todayRosterList.innerHTML = `
      <div class="roster-empty">
        <strong>ログイン後に今日の搭乗者一覧を表示します</strong>
        <span>登録済み顧客の基本曜日から、対象日の一覧を作成します。</span>
      </div>
    `;
    return;
  }

  if (!entries.length) {
    els.todayRosterList.innerHTML = `
      <div class="roster-empty">
        <strong>${escapeHtml(formatDateForRoster(date))}（${weekday.label}）の基本予定は未登録です</strong>
        <span>顧客登録で利用曜日を設定するか、「当日だけ追加する利用者」から追加してください。</span>
      </div>
    `;
    return;
  }

  const activeCount = entries.filter((entry) => !entry.absent).length;
  const extraCount = entries.filter((entry) => entry.isExtra).length;
  els.todayRosterList.innerHTML = `
    <div class="roster-summary">
      <strong>${escapeHtml(formatDateForRoster(date))}（${weekday.label}）: 搭乗予定 ${activeCount}名</strong>
      <span>基本予定 ${scheduledCount}名 / 当日追加 ${extraCount}名。来ない方は欠席にチェックしてください。</span>
    </div>
    ${entries.map((entry) => `
      <article class="roster-row ${entry.absent ? "is-absent" : ""}">
        <div class="roster-main">
          <strong>${escapeHtml(entry.patient.name)} ${entry.patient.wheelchair ? "・車いす" : ""}</strong>
          <span>${escapeHtml(entry.patient.address)}</span>
          <span class="roster-status">${entry.isExtra ? "当日追加" : "基本予定"} / ${escapeHtml(returnTypes[entry.returnType]?.label || returnTypes.normal.label)} ${escapeHtml(returnTypes[entry.returnType]?.time || returnTypes.normal.time)}</span>
        </div>
        <div class="roster-controls">
          <label class="check-line compact-check">
            <input type="checkbox" data-roster-absent="${escapeHtml(entry.patient.id)}" ${entry.absent ? "checked" : ""} />
            <span>本日来ない</span>
          </label>
          <label>
            <span>本日の帰り</span>
            <select data-roster-return="${escapeHtml(entry.patient.id)}" ${entry.absent ? "disabled" : ""}>
              <option value="normal" ${entry.returnType === "normal" ? "selected" : ""}>通常 16:30</option>
              <option value="early" ${entry.returnType === "early" ? "selected" : ""}>13:30帰り</option>
            </select>
          </label>
          <div class="roster-time-grid">
            <label>
              <span>${escapeHtml(getServiceTimeLabel("earliest"))}</span>
              <input type="time" data-roster-earliest="${escapeHtml(entry.patient.id)}" value="${escapeHtml(entry.earliest || "")}" ${entry.absent ? "disabled" : ""} />
            </label>
            <label>
              <span>${escapeHtml(getServiceTimeLabel("latest"))}</span>
              <input type="time" data-roster-latest="${escapeHtml(entry.patient.id)}" value="${escapeHtml(entry.latest || "")}" ${entry.absent ? "disabled" : ""} />
            </label>
          </div>
          <label>
            <span>配車表の備考</span>
            <textarea rows="2" data-roster-note="${escapeHtml(entry.patient.id)}" ${entry.absent ? "disabled" : ""} placeholder="ドライバーへ伝える内容">${escapeHtml(entry.note || "")}</textarea>
          </label>
          ${entry.isExtra ? `<button class="remove-button" type="button" data-remove-extra="${escapeHtml(entry.patient.id)}">当日追加を削除</button>` : ""}
        </div>
      </article>
    `).join("")}
  `;
}

function getTodayRosterEntries(date = state.serviceDate || getTodayIsoDate()) {
  const weekday = getWeekdayForDate(date);
  const plan = getDailyPlan(date);
  const byId = new Map(state.registeredPatients.map((patient) => [patient.id, patient]));
  const scheduled = state.registeredPatients
    .filter((patient) => normalizeWeeklySchedule(patient.weeklySchedule)[weekday.id])
    .map((patient) => buildRosterEntry(patient, date, false));
  const scheduledIds = new Set(scheduled.map((entry) => entry.patient.id));
  const extras = plan.extraCustomerIds
    .map((id) => byId.get(id))
    .filter((patient) => patient && !scheduledIds.has(patient.id))
    .map((patient) => buildRosterEntry(patient, date, true));
  return [...scheduled, ...extras].sort((a, b) => {
    if (a.absent !== b.absent) return a.absent ? 1 : -1;
    return a.patient.name.localeCompare(b.patient.name, "ja");
  });
}

function buildRosterEntry(patient, date, isExtra) {
  const weekday = getWeekdayForDate(date);
  const plan = getDailyPlan(date);
  const schedule = normalizeWeeklySchedule(patient.weeklySchedule);
  const defaultReturnType = schedule[weekday.id] || "normal";
  const returnType = normalizeReturnType(plan.returnOverrides[patient.id]) || defaultReturnType;
  const timeWindow = getRosterTimeWindow(patient, date, returnType);
  return {
    patient,
    isExtra,
    absent: plan.absentCustomerIds.includes(patient.id),
    returnType,
    earliest: timeWindow.earliest,
    latest: timeWindow.latest,
    note: plan.notes[patient.id] ?? patient.note ?? "",
  };
}

function handleTodayRosterChange(event) {
  const absentInput = event.target.closest("[data-roster-absent]");
  const returnSelect = event.target.closest("[data-roster-return]");
  const earliestInput = event.target.closest("[data-roster-earliest]");
  const latestInput = event.target.closest("[data-roster-latest]");
  const noteInput = event.target.closest("[data-roster-note]");
  const date = state.serviceDate || getTodayIsoDate();
  const plan = getDailyPlan(date);

  if (absentInput) {
    const id = absentInput.dataset.rosterAbsent;
    const absentSet = new Set(plan.absentCustomerIds);
    if (absentInput.checked) absentSet.add(id);
    else absentSet.delete(id);
    plan.absentCustomerIds = [...absentSet];
    saveDailyPlan(plan, { status: false });
    renderTodayRoster();
    renderDispatchSheet();
    return;
  }

  if (returnSelect) {
    const id = returnSelect.dataset.rosterReturn;
    const returnType = normalizeReturnType(returnSelect.value) || "normal";
    plan.returnOverrides[id] = returnType;
    const patient = state.registeredPatients.find((item) => item.id === id);
    if (patient) {
      const timeWindow = getRosterTimeWindow(patient, date, returnType, { ignoreOverride: true });
      plan.timeOverrides[id] = timeWindow;
    }
    saveDailyPlan(plan, { status: false });
    renderTodayRoster();
    renderDispatchSheet();
    return;
  }

  if (earliestInput || latestInput) {
    const id = earliestInput?.dataset.rosterEarliest || latestInput?.dataset.rosterLatest;
    const current = plan.timeOverrides[id] || {};
    plan.timeOverrides[id] = {
      earliest: earliestInput ? earliestInput.value : current.earliest || "",
      latest: latestInput ? latestInput.value : current.latest || "",
    };
    saveDailyPlan(plan, { status: false });
    renderDispatchSheet();
    return;
  }

  if (noteInput) {
    const id = noteInput.dataset.rosterNote;
    plan.notes[id] = noteInput.value.trim();
    saveDailyPlan(plan, { status: false });
  }
}

function handleTodayRosterInput(event) {
  const noteInput = event.target.closest("[data-roster-note]");
  if (!noteInput) return;
  const date = state.serviceDate || getTodayIsoDate();
  const plan = getDailyPlan(date);
  plan.notes[noteInput.dataset.rosterNote] = noteInput.value.trim();
  saveDailyPlan(plan, { status: false });
}

function handleTodayRosterClick(event) {
  const removeButton = event.target.closest("[data-remove-extra]");
  if (!removeButton) return;
  const date = state.serviceDate || getTodayIsoDate();
  const plan = getDailyPlan(date);
  plan.extraCustomerIds = plan.extraCustomerIds.filter((id) => id !== removeButton.dataset.removeExtra);
  delete plan.returnOverrides[removeButton.dataset.removeExtra];
  delete plan.timeOverrides[removeButton.dataset.removeExtra];
  delete plan.notes[removeButton.dataset.removeExtra];
  plan.absentCustomerIds = plan.absentCustomerIds.filter((id) => id !== removeButton.dataset.removeExtra);
  saveDailyPlan(plan);
  renderTodayRoster();
  renderDispatchSheet();
}

function addExtraTodayPatient() {
  const id = els.extraTodayPatientSelect.value;
  if (!id) {
    setStatus("当日だけ追加する利用者を選択してください。", true);
    return;
  }
  const patient = state.registeredPatients.find((item) => item.id === id);
  if (!patient) return;

  const date = state.serviceDate || getTodayIsoDate();
  const plan = getDailyPlan(date);
  const extraSet = new Set(plan.extraCustomerIds);
  extraSet.add(id);
  plan.extraCustomerIds = [...extraSet];
  plan.absentCustomerIds = plan.absentCustomerIds.filter((patientId) => patientId !== id);
  if (!plan.returnOverrides[id]) plan.returnOverrides[id] = getDefaultReturnTypeForPatient(patient, date);
  saveDailyPlan(plan);
  els.extraTodayPatientSelect.value = "";
  renderTodayRoster();
  setStatus(`${patient.name} を当日だけ追加しました。`);
}

function applyTodayRosterToRoute() {
  const date = state.serviceDate || getTodayIsoDate();
  const entries = getTodayRosterEntries(date).filter((entry) => !entry.absent);
  if (!entries.length) {
    setStatus("今日の搭乗者がいません。欠席チェックまたは基本予定を確認してください。", true);
    return;
  }

  state.patients = entries.map((entry) => buildRoutePatientFromRoster(entry));
  const needsWheelchairSwitch = state.patients.some((patient) => ensureVehicleCompatibilityForPatient(patient));
  persist();
  renderVehicles();
  renderPatients();
  clearRoute();
  renderDispatchSheet();
  logCareRouteAction("当日搭乗者反映", `${formatDateForRoster(date)}の搭乗者${entries.length}名を今日の送迎へ反映しました。`, "daily-plan", date);
  setStatus(needsWheelchairSwitch
    ? `${entries.length}名を今日の送迎へ反映しました。車いす利用者のため1号車または2号車に切り替えました。`
    : `${entries.length}名を今日の送迎へ反映しました。`);
}

function buildRoutePatientFromRoster(entry) {
  return {
    ...entry.patient,
    id: makeId(),
    registryId: entry.patient.id,
    returnType: entry.returnType,
    earliest: entry.earliest || "",
    latest: entry.latest || "",
    note: entry.note || "",
    assignedVehicleId: getCompatibleVehicleId(state.vehicleId, Boolean(entry.patient.wheelchair)),
  };
}

function getRosterTimeWindow(patient, date, returnType, options = {}) {
  const plan = getDailyPlan(date);
  const override = options.ignoreOverride ? null : plan.timeOverrides[patient.id];
  if (override?.earliest || override?.latest) {
    return {
      earliest: override.earliest || "",
      latest: override.latest || "",
    };
  }

  if (normalizeServiceType(state.serviceType) === "evening") {
    const fallback = returnTypes[returnType] || returnTypes.normal;
    return {
      earliest: patient.earliest || fallback.earliest,
      latest: patient.latest || fallback.latest,
    };
  }

  return {
    earliest: patient.earliest || "",
    latest: patient.latest || "",
  };
}

function getServiceTimeLabel(kind) {
  const service = getServiceTypeConfig(state.serviceType);
  if (kind === "latest") return service.actionLabel === "送り" ? "送り希望終了" : "迎え希望終了";
  return service.actionLabel === "送り" ? "送り希望開始" : "迎え希望開始";
}

async function loadDailyPlanForDate(date, options = {}) {
  const normalizedDate = isIsoDate(date) ? date : getTodayIsoDate();
  state.serviceDate = normalizedDate;
  els.serviceDate.value = normalizedDate;
  if (!backendAvailable || !currentUser) {
    renderTodayRoster();
    return;
  }

  try {
    const data = await apiFetch(`/api/care-route/daily-plan?date=${encodeURIComponent(normalizedDate)}`);
    state.dailyPlans[normalizedDate] = normalizeDailyPlan(data.plan, normalizedDate);
    persist();
    renderTodayRoster();
    if (!options.silent) setStatus("当日の搭乗者一覧を更新しました。");
  } catch (error) {
    renderTodayRoster();
    if (!options.silent) setStatus(error.message || "当日の搭乗者一覧を取得できませんでした。", true);
  }
}

function saveDailyPlan(plan, options = {}) {
  const normalized = normalizeDailyPlan(plan, plan.date || state.serviceDate || getTodayIsoDate());
  state.dailyPlans[normalized.date] = normalized;
  persist();

  if (backendAvailable && currentUser && canEditCustomers()) {
    apiFetch("/api/care-route/daily-plan", {
      method: "POST",
      body: normalized,
    }).catch((error) => setStatus(error.message || "当日の変更を保存できませんでした。", true));
  }

  if (options.status !== false) {
    setStatus("当日の搭乗者一覧を保存しました。");
  }
}

function getDailyPlan(date = state.serviceDate || getTodayIsoDate()) {
  const normalizedDate = isIsoDate(date) ? date : getTodayIsoDate();
  if (!state.dailyPlans[normalizedDate]) {
    state.dailyPlans[normalizedDate] = createEmptyDailyPlan(normalizedDate);
  }
  return state.dailyPlans[normalizedDate];
}

function normalizeDailyPlans(value) {
  const result = {};
  if (!value || typeof value !== "object") return result;
  Object.entries(value).forEach(([date, plan]) => {
    if (isIsoDate(date)) result[date] = normalizeDailyPlan(plan, date);
  });
  return result;
}

function normalizeDailyPlan(plan, fallbackDate = getTodayIsoDate()) {
  const date = isIsoDate(plan?.date) ? plan.date : fallbackDate;
  const returnOverrides = {};
  Object.entries(plan?.returnOverrides || {}).forEach(([id, value]) => {
    const returnType = normalizeReturnType(value);
    if (id && returnType) returnOverrides[id] = returnType;
  });
  const timeOverrides = {};
  Object.entries(plan?.timeOverrides || {}).forEach(([id, value]) => {
    if (!id || !value || typeof value !== "object") return;
    const earliest = normalizeTimeValue(value.earliest);
    const latest = normalizeTimeValue(value.latest);
    if (earliest || latest) timeOverrides[id] = { earliest, latest };
  });
  const notes = {};
  Object.entries(plan?.notes || {}).forEach(([id, value]) => {
    const note = String(value || "").trim();
    if (id && note) notes[id] = note;
  });
  return {
    date,
    absentCustomerIds: uniqueStringArray(plan?.absentCustomerIds),
    returnOverrides,
    timeOverrides,
    extraCustomerIds: uniqueStringArray(plan?.extraCustomerIds),
    notes,
  };
}

function createEmptyDailyPlan(date) {
  return {
    date,
    absentCustomerIds: [],
    returnOverrides: {},
    timeOverrides: {},
    extraCustomerIds: [],
    notes: {},
  };
}

function uniqueStringArray(value) {
  return [...new Set(Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [])];
}

function applyRegisteredPatientToForm(patientId, options = {}) {
  const patient = getRegisteredPatientById(patientId);
  if (!patient) return false;

  els.registeredPatientSelect.value = patient.id;
  els.patientName.value = patient.name;
  els.patientAddress.value = patient.address;
  els.patientPassengers.value = patient.passengers || 1;
  els.patientWheelchair.checked = Boolean(patient.wheelchair);
  els.patientEarliest.value = patient.earliest || "";
  els.patientLatest.value = patient.latest || "";
  els.patientNote.value = patient.note || "";
  lastAutofilledPatientId = patient.id;
  ensureVehicleCompatibility({ status: true });
  renderVehicles();

  if (options.status) {
    setStatus(`${patient.name} の登録情報を送迎登録へ反映しました。`);
  }
  return true;
}

function handlePatientNameInput() {
  const match = findRegisteredPatientByName(els.patientName.value);
  if (!match) {
    els.registeredPatientSelect.value = "";
    lastAutofilledPatientId = "";
    return;
  }

  const canOverwrite = !els.patientAddress.value.trim() ||
    lastAutofilledPatientId ||
    normalizeText(els.patientAddress.value) === normalizeText(match.address);
  if (!canOverwrite) return;

  applyRegisteredPatientToForm(match.id);
}

function findRegisteredPatientByName(name) {
  const normalizedName = normalizeText(name);
  if (!normalizedName || normalizedName.length < 2) return null;

  const registeredPatients = getSelectableRegisteredPatients();
  const exact = registeredPatients.find((patient) => normalizeText(patient.name) === normalizedName);
  if (exact) return exact;

  const partial = registeredPatients.filter((patient) => {
    const patientName = normalizeText(patient.name);
    return patientName.includes(normalizedName) || normalizedName.includes(patientName);
  });
  return partial.length === 1 ? partial[0] : null;
}

async function saveRegisteredPatient(event) {
  event.preventDefault();
  const registeredPatient = readRegistryForm();

  if (!registeredPatient.name || !registeredPatient.address) {
    setStatus("登録する患者さまのお名前と住所を入力してください。", true);
    return;
  }

  if (backendAvailable && currentUser) {
    const wasEditing = Boolean(editingRegistryId);
    try {
      const payload = { ...registeredPatient, id: editingRegistryId || "" };
      const data = await apiFetch("/api/care-route/customer", {
        method: "POST",
        body: payload,
      });
      state.registeredPatients = Array.isArray(data.customers) ? data.customers : state.registeredPatients;
      resetRegistryForm();
      persist();
      renderRegisteredPatients();
      setStatus(wasEditing ? "登録済み顧客を更新しました。" : "顧客を登録しました。");
    } catch (error) {
      setStatus(error.message || "顧客登録に失敗しました。", true);
    }
    return;
  }

  const duplicate = state.registeredPatients.find((patient) => isSamePatientRecord(patient, registeredPatient));
  const targetId = editingRegistryId || duplicate?.id || makeId();
  const savedPatient = { ...registeredPatient, id: targetId };

  if (editingRegistryId || duplicate) {
    state.registeredPatients = state.registeredPatients.map((patient) => patient.id === targetId ? savedPatient : patient);
    setStatus("登録済み顧客を更新しました。");
  } else {
    state.registeredPatients.push(savedPatient);
    setStatus("顧客を登録しました。");
  }

  resetRegistryForm();
  persist();
  renderRegisteredPatients();
}

function readRegistryForm() {
  return {
    name: els.registryName.value.trim(),
    address: els.registryAddress.value.trim(),
    passengers: Math.max(1, Number(els.registryPassengers.value || 1)),
    wheelchair: els.registryWheelchair.checked,
    earliest: els.registryEarliest.value || "",
    latest: els.registryLatest.value || "",
    note: els.registryNote.value.trim(),
    weeklySchedule: readWeeklyScheduleForm(),
  };
}

function handleRegisteredPatientAction(event) {
  const callButton = event.target.closest("[data-call-registry]");
  const editButton = event.target.closest("[data-edit-registry]");
  const deleteButton = event.target.closest("[data-delete-registry]");

  if (callButton) addRegisteredPatientToRoute(callButton.dataset.callRegistry);
  if (editButton) startEditingRegisteredPatient(editButton.dataset.editRegistry);
  if (deleteButton) void deleteRegisteredPatient(deleteButton.dataset.deleteRegistry);
}

function addRegisteredPatientToRoute(id) {
  const registeredPatient = state.registeredPatients.find((patient) => patient.id === id);
  if (!registeredPatient) return;

  if (state.patients.some((patient) => patient.registryId === id || isSamePatientRecord(patient, registeredPatient))) {
    state.activeAppTab = "plan";
    persist();
    renderAppTabs();
    setStatus(`${registeredPatient.name} はすでに今日の送迎に入っています。`, true);
    return;
  }

  state.patients.push({
    ...registeredPatient,
    id: makeId(),
    registryId: registeredPatient.id,
    assignedVehicleId: getCompatibleVehicleId(state.vehicleId, Boolean(registeredPatient.wheelchair)),
  });
  const changedVehicle = ensureVehicleCompatibilityForPatient(registeredPatient);
  state.activeAppTab = "plan";
  persist();
  renderAppTabs();
  renderVehicles();
  renderPatients();
  logCareRouteAction("顧客呼び出し", `${registeredPatient.name} 様を今日の送迎へ追加しました。`, "customer", registeredPatient.id);
  setStatus(changedVehicle
    ? `${registeredPatient.name} を追加しました。車いす利用者のため1号車または2号車に切り替えました。`
    : `${registeredPatient.name} を今日の送迎に追加しました。`);
}

function startEditingRegisteredPatient(id) {
  const registeredPatient = state.registeredPatients.find((patient) => patient.id === id);
  if (!registeredPatient) return;

  editingRegistryId = id;
  els.registryName.value = registeredPatient.name;
  els.registryAddress.value = registeredPatient.address;
  els.registryPassengers.value = registeredPatient.passengers || 1;
  els.registryEarliest.value = registeredPatient.earliest || "";
  els.registryLatest.value = registeredPatient.latest || "";
  els.registryWheelchair.checked = Boolean(registeredPatient.wheelchair);
  els.registryNote.value = registeredPatient.note || "";
  fillWeeklyScheduleForm(registeredPatient.weeklySchedule);
  els.registrySubmitButton.textContent = "登録内容を更新";
  els.registryCancelEditButton.hidden = false;
  setStatus(`${registeredPatient.name} の登録内容を編集中です。`);
}

async function deleteRegisteredPatient(id) {
  const registeredPatient = state.registeredPatients.find((patient) => patient.id === id);
  if (backendAvailable && currentUser) {
    try {
      const data = await apiFetch(`/api/care-route/customer?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      state.registeredPatients = Array.isArray(data.customers) ? data.customers : [];
      if (editingRegistryId === id) resetRegistryForm();
      persist();
      renderRegisteredPatients();
      setStatus(registeredPatient ? `${registeredPatient.name} を登録一覧から削除しました。` : "登録済み顧客を削除しました。");
    } catch (error) {
      setStatus(error.message || "顧客削除に失敗しました。", true);
    }
    return;
  }

  state.registeredPatients = state.registeredPatients.filter((patient) => patient.id !== id);
  if (editingRegistryId === id) resetRegistryForm();
  persist();
  renderRegisteredPatients();
  setStatus(registeredPatient ? `${registeredPatient.name} を登録一覧から削除しました。` : "登録済み患者さまを削除しました。");
}

async function registerCurrentPatients() {
  if (!state.patients.length) {
    setStatus("今日の送迎に患者さまがいないため、登録できません。", true);
    return;
  }

  if (backendAvailable && currentUser) {
    let savedCount = 0;
    try {
      for (const patient of state.patients) {
        await apiFetch("/api/care-route/customer", {
          method: "POST",
          body: {
            name: patient.name,
            address: patient.address,
            passengers: patient.passengers || 1,
            wheelchair: Boolean(patient.wheelchair),
            earliest: patient.earliest || "",
            latest: patient.latest || "",
            note: patient.note || "",
            weeklySchedule: patient.weeklySchedule || {},
          },
        });
        savedCount += 1;
      }
      await loadSecureCareRouteState();
      setStatus(`今日の送迎から${savedCount}名をサーバーへ登録しました。`);
    } catch (error) {
      setStatus(error.message || "一括登録に失敗しました。", true);
    }
    return;
  }

  let addedCount = 0;
  state.patients.forEach((patient) => {
    if (state.registeredPatients.some((registeredPatient) => isSamePatientRecord(registeredPatient, patient))) return;
    state.registeredPatients.push({
      id: makeId(),
      name: patient.name,
      address: patient.address,
      passengers: patient.passengers || 1,
      wheelchair: Boolean(patient.wheelchair),
      earliest: patient.earliest || "",
      latest: patient.latest || "",
      note: patient.note || "",
      weeklySchedule: patient.weeklySchedule || {},
    });
    addedCount += 1;
  });

  persist();
  renderRegisteredPatients();
  setStatus(addedCount ? `今日の送迎から${addedCount}名を登録しました。` : "今日の送迎対象はすべて登録済みです。");
}

async function loadBulkImportFile() {
  const file = els.bulkImportFile.files?.[0];
  if (!file) return;
  try {
    const imported = await readBulkImportFile(file);
    els.bulkImportText.value = imported.text;
    pendingBulkPatients = [];
    els.bulkCommitButton.disabled = true;
    syncRegisteredPatientInputs();
    setStatus(`${imported.label}を読み込みました。内容を確認してください。`);
  } catch (error) {
    setStatus(error.message || "ファイルを読み込めませんでした。CSV、テキスト、Excelで保存してから再度選択してください。", true);
  }
}

async function readBulkImportFile(file) {
  const fileName = String(file.name || "").toLowerCase();
  if (/\.(xlsx|xlsm|xls)$/i.test(fileName)) {
    return readExcelBulkImportFile(file);
  }
  return {
    label: "CSV/テキストファイル",
    text: await file.text(),
  };
}

async function readExcelBulkImportFile(file) {
  if (!window.XLSX) {
    throw new Error("Excel読み込みライブラリを取得できませんでした。CSVで保存してから再度選択してください。");
  }
  const data = await file.arrayBuffer();
  const workbook = window.XLSX.read(data, { type: "array", cellDates: false });
  const sheets = workbook.SheetNames
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });
      return {
        sheetName,
        rows: rows.map((row) => row.map((cell) => String(cell ?? "").trim())),
      };
    })
    .filter((sheet) => sheet.rows.some((row) => row.some(Boolean)));

  if (!sheets.length) throw new Error("Excel内に取り込める表が見つかりませんでした。");

  return {
    label: `Excelファイル（${sheets.length}シート）`,
    text: stringifyWorkbookRowsForBulkImport(sheets),
  };
}

function stringifyWorkbookRowsForBulkImport(sheets) {
  return sheets
    .flatMap((sheet) => [
      [`# シート: ${sheet.sheetName}`],
      ...sheet.rows,
      [],
    ])
    .map((row) => row.map((cell) => String(cell ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ")).join("\t"))
    .join("\n");
}

async function copyBulkTemplate() {
  const template = [
    ["利用者名", "住所", "人数", "車いす", "何時以降", "何時まで", "利用曜日", "帰り区分", "備考"].join("\t"),
    ["田中様", "川崎市川崎区大師町10-6", "1", "なし", "", "", "月,水,金", "通常", "玄関前で声かけ"].join("\t"),
    ["佐藤様", "川崎大師駅", "1", "あり", "", "", "火:13:30,木:通常", "", "車いす対応"].join("\t"),
  ].join("\n");
  try {
    await navigator.clipboard.writeText(template);
    setStatus("Excel用ひな形をコピーしました。Excelへ貼り付けて編集できます。");
  } catch {
    els.bulkImportText.value = template;
    setStatus("ひな形を入力欄に入れました。コピーできない端末ではここから編集してください。");
  }
}

function previewBulkImport() {
  const rows = parseBulkPatients(els.bulkImportText.value);
  pendingBulkPatients = rows.valid;
  els.bulkCommitButton.disabled = pendingBulkPatients.length === 0 || !canEditCustomers();
  syncRegisteredPatientInputs();
  renderBulkPreview(rows);
  if (!rows.valid.length) {
    setStatus("取り込める利用者が見つかりません。利用者名と住所を確認してください。", true);
    return;
  }
  setStatus(`${rows.valid.length}名を確認しました。送迎登録のプルダウンから選択できます。問題なければ登録してください。`);
}

async function commitBulkImport() {
  if (!pendingBulkPatients.length) {
    setStatus("先に内容を確認してください。", true);
    return;
  }
  if (!canEditCustomers()) {
    setStatus("顧客登録の編集権限がありません。", true);
    return;
  }

  const addToRoute = els.bulkAddToRoute.checked;
  let savedCount = 0;
  let routeAddedCount = 0;

  if (backendAvailable && currentUser) {
    try {
      for (const patient of pendingBulkPatients) {
        await apiFetch("/api/care-route/customer", {
          method: "POST",
          body: {
            name: patient.name,
            address: patient.address,
            passengers: patient.passengers,
            wheelchair: patient.wheelchair,
            earliest: patient.earliest,
            latest: patient.latest,
            note: patient.note || "",
            weeklySchedule: patient.weeklySchedule || {},
          },
        });
        savedCount += 1;
        if (addToRoute) routeAddedCount += addPatientToTodayRoute(patient);
      }
      await loadSecureCareRouteState();
    } catch (error) {
      setStatus(error.message || "一括登録に失敗しました。", true);
      return;
    }
  } else {
    pendingBulkPatients.forEach((patient) => {
      const duplicate = state.registeredPatients.find((registeredPatient) => isSamePatientRecord(registeredPatient, patient));
      if (!duplicate) {
        state.registeredPatients.push({ ...patient, id: makeId() });
        savedCount += 1;
      }
      if (addToRoute) routeAddedCount += addPatientToTodayRoute(patient);
    });
  }

  pendingBulkPatients = [];
  els.bulkCommitButton.disabled = true;
  persist();
  renderVehicles();
  renderPatients();
  renderRegisteredPatients();
  if (addToRoute) {
    state.activeAppTab = "plan";
    renderAppTabs();
  }
  setStatus(`Excel一覧から${savedCount}名を登録しました${addToRoute ? `。今日の送迎へ${routeAddedCount}名を追加しました。` : "。"}`);
}

function addPatientToTodayRoute(patient) {
  if (state.patients.some((item) => isSamePatientRecord(item, patient))) return 0;
  state.patients.push({
    ...patient,
    id: makeId(),
    registryId: patient.id || "",
    assignedVehicleId: getCompatibleVehicleId(state.vehicleId, Boolean(patient.wheelchair)),
  });
  ensureVehicleCompatibilityForPatient(patient);
  return 1;
}

function parseBulkPatients(rawText) {
  const lines = String(rawText || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines
    .map((line) => delimiter === "\t" ? line.split("\t") : parseCsvLine(line))
    .map((columns) => columns.map((column) => column.trim()));
  return parseBulkPatientRows(rows);
}

function parseBulkPatientRows(rows) {
  const result = { valid: [], errors: [] };
  const seen = new Set();
  let headerMap = null;
  let activeSheet = "";

  rows.forEach((columns, index) => {
    const normalizedColumns = columns.map((column) => column.trim());
    if (!normalizedColumns.some(Boolean)) return;
    const nonEmptyCount = normalizedColumns.filter(Boolean).length;

    const sheetLabel = getSheetMarker(normalizedColumns);
    if (sheetLabel) {
      activeSheet = sheetLabel;
      headerMap = null;
      return;
    }

    if (looksLikeBulkHeader(normalizedColumns)) {
      headerMap = createBulkHeaderMap(normalizedColumns);
      return;
    }

    if (!headerMap && nonEmptyCount < 2) return;

    const patient = normalizeBulkPatientRow(normalizedColumns, headerMap);
    if (!patient.name && !patient.address) return;
    if (!patient.name || !patient.address) {
      const rowLabel = activeSheet ? `${activeSheet} ${index + 1}行目` : `${index + 1}行目`;
      result.errors.push(`${rowLabel}: 利用者名または住所がありません。`);
      return;
    }

    const key = `${normalizeText(patient.name)}:${normalizeText(patient.address)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.valid.push(patient);
  });

  return result;
}

function getSheetMarker(columns) {
  const first = String(columns[0] || "").trim();
  const match = first.match(/^#\s*シート[:：]\s*(.+)$/);
  return match ? match[1].trim() : "";
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function looksLikeBulkHeader(columns) {
  const headerScore = createBulkHeaderMap(columns).score || 0;
  return headerScore >= 2;
}

function createBulkHeaderMap(columns) {
  const map = { weekdayColumns: {}, score: 0 };
  columns.forEach((column, index) => {
    const value = normalizeText(column);
    if (!value) return;
    const weekdayId = getWeekdayHeaderId(value);
    if (weekdayId) {
      map.weekdayColumns[weekdayId] = index;
      map.score += 1;
      return;
    }
    if (/^(利用者名|利用者氏名|利用者|氏名|名前|お名前|患者名|患者|利用者様|患者様)$/.test(value)) {
      map.name = index;
      map.score += 2;
    } else if (/住所|所在地|送迎先|自宅|居宅|住まい/.test(value)) {
      map.address = index;
      map.score += 2;
    } else if (/人数|利用人数|座席人数|乗車人数|同乗/.test(value)) {
      map.passengers = index;
      map.score += 1;
    } else if (/車いす|車イス|車椅子|車イス|wheelchair|^wc$/i.test(value)) {
      map.wheelchair = index;
      map.score += 1;
    } else if (/何時以降|希望開始|開始希望|迎え以降|送り以降|以降|開始/.test(value)) {
      map.earliest = index;
      map.score += 1;
    } else if (/何時まで|希望終了|終了希望|迎えまで|送りまで|まで|終了/.test(value)) {
      map.latest = index;
      map.score += 1;
    } else if (/利用曜日|来所曜日|通所曜日|予定曜日|利用日|通所日|来所日|週間利用|一週間|1週間/.test(value)) {
      map.weekdays = index;
      map.score += 1;
    } else if (/帰り区分|帰宅区分|帰り時間|帰宅時間|帰り|帰宅|送迎区分|通常早帰り/.test(value)) {
      map.returnType = index;
      map.score += 1;
    } else if (/備考|メモ|注意|連絡事項|特記事項|申し送り|引継|引き継ぎ/.test(value)) {
      map.note = index;
      map.score += 1;
    }
  });
  return map;
}

function normalizeBulkPatientRow(columns, headerMap) {
  const pick = (key, fallbackIndex) => columns[headerMap?.[key] ?? fallbackIndex] || "";
  const textSchedule = parseWeeklyScheduleText(pick("weekdays", 6), pick("returnType", 7));
  const weekdayColumnSchedule = parseWeekdayColumnSchedule(columns, headerMap);
  return {
    id: makeId(),
    name: pick("name", 0).trim(),
    address: pick("address", 1).trim(),
    passengers: normalizePassengerCount(pick("passengers", 2)),
    wheelchair: normalizeWheelchairValue(pick("wheelchair", 3)),
    earliest: normalizeTimeValue(pick("earliest", 4)),
    latest: normalizeTimeValue(pick("latest", 5)),
    weeklySchedule: { ...textSchedule, ...weekdayColumnSchedule },
    note: pick("note", 8).trim(),
  };
}

function parseWeekdayColumnSchedule(columns, headerMap) {
  const schedule = {};
  Object.entries(headerMap?.weekdayColumns || {}).forEach(([weekdayId, index]) => {
    const returnType = normalizeWeekdayCellReturnType(columns[index]);
    if (returnType) schedule[weekdayId] = returnType;
  });
  return schedule;
}

function normalizeWeekdayCellReturnType(value) {
  const text = String(value || "").trim();
  if (!text || /^(なし|無|休|休み|欠席|×|x|no|false|-|ー|－)$/i.test(text)) return "";
  return normalizeReturnType(text) || "normal";
}

function normalizePassengerCount(value) {
  const count = Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.max(1, Math.min(8, Math.round(count)));
}

function normalizeWheelchairValue(value) {
  return /あり|有|必要|車いす|車イス|車椅子|○|◯|〇|1|true|yes/i.test(String(value || ""));
}

function normalizeTimeValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const normalized = text.replace("：", ":").replace(/[時分]/g, ":").replace(/:+$/, "");
  const match = normalized.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function readWeeklyScheduleForm() {
  const schedule = {};
  weekdays.forEach((weekday) => {
    const enabled = document.querySelector(`[data-weekday-enabled="${weekday.id}"]`);
    const returnSelect = document.querySelector(`[data-weekday-return="${weekday.id}"]`);
    if (enabled?.checked) {
      schedule[weekday.id] = normalizeReturnType(returnSelect?.value) || "normal";
    }
  });
  return schedule;
}

function fillWeeklyScheduleForm(schedule) {
  const normalized = normalizeWeeklySchedule(schedule);
  weekdays.forEach((weekday) => {
    const enabled = document.querySelector(`[data-weekday-enabled="${weekday.id}"]`);
    const returnSelect = document.querySelector(`[data-weekday-return="${weekday.id}"]`);
    if (!enabled || !returnSelect) return;
    enabled.checked = Boolean(normalized[weekday.id]);
    returnSelect.value = normalized[weekday.id] || "normal";
  });
  syncWeeklyScheduleSelects();
}

function syncWeeklyScheduleSelects() {
  weekdays.forEach((weekday) => {
    const enabled = document.querySelector(`[data-weekday-enabled="${weekday.id}"]`);
    const returnSelect = document.querySelector(`[data-weekday-return="${weekday.id}"]`);
    if (!enabled || !returnSelect) return;
    returnSelect.disabled = !enabled.checked;
  });
}

function normalizeWeeklySchedule(value) {
  const schedule = {};
  if (!value || typeof value !== "object") return schedule;
  weekdays.forEach((weekday) => {
    const returnType = normalizeReturnType(value[weekday.id]);
    if (returnType) schedule[weekday.id] = returnType;
  });
  return schedule;
}

function parseWeeklyScheduleText(weekdaysText, returnTypeText) {
  const schedule = {};
  const defaultReturnType = normalizeReturnType(returnTypeText) || "normal";
  const source = String(weekdaysText || "").trim();
  if (!source) return schedule;

  source
    .split(/[、,，\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      const [dayText, typeText] = token.split(/[:：=＝]/).map((part) => part.trim());
      const weekdayId = getWeekdayIdFromText(dayText);
      if (!weekdayId) return;
      schedule[weekdayId] = normalizeReturnType(typeText) || defaultReturnType;
    });
  return schedule;
}

function normalizeReturnType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text === "early" || text === "2" || /13|早|短|午後/.test(text)) return "early";
  if (text === "normal" || text === "1" || /16|通常|普通|標準/.test(text)) return "normal";
  return returnTypes[text] ? text : "";
}

function getDefaultReturnTypeForPatient(patient, date) {
  const weekday = getWeekdayForDate(date);
  return normalizeWeeklySchedule(patient.weeklySchedule)[weekday.id] || "normal";
}

function getWeekdayIdFromText(value) {
  const text = String(value || "").trim().toLowerCase();
  const normalized = text.replace(/曜(?:日)?/g, "");
  const map = {
    月: "mon",
    mon: "mon",
    monday: "mon",
    火: "tue",
    tue: "tue",
    tuesday: "tue",
    水: "wed",
    wed: "wed",
    wednesday: "wed",
    木: "thu",
    thu: "thu",
    thursday: "thu",
    金: "fri",
    fri: "fri",
    friday: "fri",
    土: "sat",
    sat: "sat",
    saturday: "sat",
    日: "sun",
    sun: "sun",
    sunday: "sun",
  };
  return map[normalized] || "";
}

function getWeekdayHeaderId(value) {
  const text = normalizeText(value)
    .replace(/[()（）［］\[\]【】]/g, "")
    .replace(/曜日/g, "曜");
  const candidates = weekdays.map((weekday) => ({
    id: weekday.id,
    label: weekday.label,
    pattern: new RegExp(`^${weekday.label}(曜)?(利用|来所|通所|予定|帰り|帰宅|送迎|区分|時間)?$`),
  }));
  return candidates.find((candidate) => text === candidate.label || candidate.pattern.test(text))?.id || "";
}

function formatWeeklyScheduleSummary(schedule) {
  const normalized = normalizeWeeklySchedule(schedule);
  const parts = weekdays
    .filter((weekday) => normalized[weekday.id])
    .map((weekday) => `${weekday.label}:${returnTypes[normalized[weekday.id]]?.time || returnTypes.normal.time}`);
  return parts.length ? `基本曜日 ${parts.join(" / ")}` : "基本曜日 未設定";
}

function renderBulkPreview(rows) {
  if (!rows.valid.length && !rows.errors.length) {
    els.bulkImportPreview.textContent = "貼り付け内容が空です。";
    return;
  }
  const previewRows = rows.valid.slice(0, 20).map((patient) => `
    <tr>
      <td>${escapeHtml(patient.name)}</td>
      <td>${escapeHtml(patient.address)}</td>
      <td>${patient.passengers}</td>
      <td>${patient.wheelchair ? "あり" : "なし"}</td>
      <td>${escapeHtml(formatWindow(patient))}</td>
      <td>${escapeHtml(formatWeeklyScheduleSummary(patient.weeklySchedule))}</td>
      <td>${escapeHtml(patient.note || "")}</td>
    </tr>
  `).join("");
  const errorHtml = rows.errors.length ? `<p>${escapeHtml(rows.errors.slice(0, 5).join(" / "))}</p>` : "";
  els.bulkImportPreview.innerHTML = `
    <strong>${rows.valid.length}名を取り込み候補にしました。</strong>
    ${errorHtml}
    <table>
      <thead><tr><th>利用者名</th><th>住所</th><th>人数</th><th>車いす</th><th>時間</th><th>基本曜日</th><th>備考</th></tr></thead>
      <tbody>${previewRows}</tbody>
    </table>
  `;
}

function resetRegistryForm() {
  editingRegistryId = null;
  els.registryForm.reset();
  els.registryPassengers.value = "1";
  els.registryNote.value = "";
  fillWeeklyScheduleForm({});
  els.registrySubmitButton.textContent = "顧客を登録";
  els.registryCancelEditButton.hidden = true;
}

async function optimizeRoute(options = {}) {
  state.startAddress = els.startAddress.value.trim();
  state.endAddress = els.endAddress.value.trim();
  state.serviceType = normalizeServiceType(els.serviceType.value);
  state.useNowTime = els.useNowTime.checked;
  state.startTime = state.useNowTime ? getCurrentTimeValue() : els.startTime.value || "08:30";
  els.startTime.value = state.startTime;
  persist();

  const validation = validatePlan();
  if (validation.blockers.length) {
    renderBlockingResult(validation.blockers, validation.warnings);
    setStatus("定員または車いす対応を確認してください。", true);
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
    state.activeAppTab = "map";
    persist();
    renderAppTabs();
    logCareRouteAction("ルート作成", `${state.patients.length}名の送迎ルートを作成しました。`, "route", new Date().toISOString());
    setStatus(options.silent ? `自動更新しました。${formatClock(new Date())}` : "ルートを作成しました。");
  } catch (error) {
    setStatus(error.message || "ルート作成に失敗しました。", true);
    renderError(error);
  } finally {
    setBusy(false);
  }
}

function validatePlan() {
  normalizePatientVehicleAssignments();
  const vehicle = getVehicle();
  const totalPassengers = getTotalPassengers();
  const seatedPassengers = getSeatedPassengers();
  const wheelchairCount = getWheelchairCount();
  const blockers = [];
  const warnings = [];

  if (!state.startAddress) blockers.push("出発地を入力してください。");
  if (!state.patients.length) blockers.push("患者様を1名以上追加してください。");
  if (seatedPassengers > vehicle.capacity) {
    blockers.push(`${vehicle.name}の座席利用は${vehicle.capacity}名までです。現在は座席利用${seatedPassengers}名です。`);
  }
  if (wheelchairCount && !vehicle.wheelchair) {
    blockers.push("車いす利用の方がいます。1号車または2号車を選んでください。");
  }
  if (wheelchairCount > (vehicle.wheelchairCapacity || 0)) {
    blockers.push(`${vehicle.name}の車いす対応は${vehicle.wheelchairCapacity || 0}台までです。現在は${wheelchairCount}台です。`);
  }
  if (state.patients.some((patient) => patient.earliest && patient.latest && timeToMinutes(patient.earliest) > timeToMinutes(patient.latest))) {
    blockers.push("時間制約の開始時刻が終了時刻より後になっている患者様がいます。");
  }
  validateVehicleAssignments().forEach((message) => blockers.push(message));
  if (!wheelchairCount && totalPassengers > 5 && vehicle.id !== "car3") {
    warnings.push("座席利用が6名以上の送迎です。3号車の利用を検討してください。");
  }
  warnings.push("3分ごとの道路ルート再取得と時間帯補正で、できるだけ現在状況に近づけます。");
  return { blockers, warnings };
}

function validateVehicleAssignments() {
  const messages = [];
  const groups = groupPatientsByVehicle();
  vehicles.forEach((vehicle) => {
    const patients = groups.get(vehicle.id) || [];
    if (!patients.length) return;
    const seated = patients.reduce((sum, patient) => sum + (patient.wheelchair ? 0 : Number(patient.passengers || 1)), 0);
    const wheelchair = patients.filter((patient) => patient.wheelchair).length;
    if (seated > vehicle.capacity) messages.push(`${vehicle.name}の配車割当が座席定員を超えています。座席${seated}/${vehicle.capacity}名です。`);
    if (wheelchair > (vehicle.wheelchairCapacity || 0)) messages.push(`${vehicle.name}の配車割当が車いす台数を超えています。車いす${wheelchair}/${vehicle.wheelchairCapacity || 0}台です。`);
    if (wheelchair && !vehicle.wheelchair) messages.push(`${vehicle.name}には車いす利用者を割り当てできません。`);
  });
  return messages;
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

  const known = findKnownLocation(address);
  if (known) return { lat: known.lat, lon: known.lon, label };

  const queries = buildGeocodeQueries(address);
  for (const query of queries) {
    const cacheKey = query.toLowerCase();
    if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

    const location = await geocodeWithNominatim(query, label) || await geocodeWithGsi(query, label);
    if (!location) continue;
    geocodeCache.set(cacheKey, location);
    return location;
  }

  throw new Error(`${label}の住所が見つかりませんでした。川崎区内の住所、駅名、病院名、クリニック名を入力してください。`);
}

async function geocodeWithNominatim(query, label) {
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "3",
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
  const result = results.find((item) => isInKawasakiBounds({ lat: Number(item.lat), lon: Number(item.lon) }));
  return result ? { lat: Number(result.lat), lon: Number(result.lon), label } : null;
}

async function geocodeWithGsi(query, label) {
  const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const results = await response.json();
  const result = results.find((item) => isInKawasakiBounds({
    lat: Number(item.geometry?.coordinates?.[1]),
    lon: Number(item.geometry?.coordinates?.[0]),
  }));
  if (!result) return null;
  return {
    lat: Number(result.geometry.coordinates[1]),
    lon: Number(result.geometry.coordinates[0]),
    label,
  };
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
  clearRoute({ focusStart: false });
  lastRouteOrderedPatients = plan.ordered.map((stop) => ({ ...stop }));
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
  const service = getServiceTypeConfig(state.serviceType);
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
      <div class="summary-card"><span>便区分</span><strong>${escapeHtml(service.shortLabel)}</strong></div>
      <div class="summary-card"><span>車両</span><strong>${escapeHtml(vehicle.name)}</strong></div>
      <div class="summary-card"><span>人数</span><strong>${getCapacitySummary(vehicle)}</strong></div>
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
            <span>${escapeHtml(stop.address)} / ${escapeHtml(formatWindow(stop))}${stop.wait ? ` / 待機 ${stop.wait}分` : ""}${stop.note ? ` / 備考: ${escapeHtml(stop.note)}` : ""}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
  renderDispatchSheet();
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
      <div class="warning-item">住所を「川崎市川崎区」から入力するか、駅名・病院名・クリニック名で入力してください。</div>
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

function clearRoute(options = {}) {
  const shouldFocusStart = options.focusStart !== false;
  markerLayer?.clearLayers();
  routeLayer?.clearLayers();
  lastRouteBounds = null;
  lastRouteOrderedPatients = [];
  lastGoogleMapsUrl = "";
  els.googleMapsButton.disabled = true;
  if (shouldFocusStart) focusStartAddressOnMap();
}

function fitRouteBounds() {
  if (lastRouteBounds?.isValid()) {
    map.fitBounds(lastRouteBounds.pad(0.18));
  } else {
    focusStartAddressOnMap();
  }
}

function focusStartAddressOnMap() {
  if (!map || !markerLayer) return;
  if (lastRouteBounds?.isValid()) return;

  const startLocation = resolveStartLocationForMap();
  markerLayer.clearLayers();
  addMarker(startLocation, "出", "出発地", "start");
  map.setView([startLocation.lat, startLocation.lon], INITIAL_MAP_ZOOM);
}

function resolveStartLocationForMap() {
  const coordinate = parseCoordinate(state.startAddress);
  if (coordinate) return coordinate;
  const known = findKnownLocation(state.startAddress || DEFAULT_BASE_ADDRESS);
  if (known) return { lat: known.lat, lon: known.lon };
  return BASE_LOCATION;
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

function normalizeServiceType(value) {
  return serviceTypes[value] ? value : "morning";
}

function getServiceTypeConfig(value) {
  return serviceTypes[normalizeServiceType(value)];
}

function getTodayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getWeekdayForDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = Number.isFinite(date.getTime()) ? date.getDay() : new Date().getDay();
  return weekdays.find((weekday) => weekday.day === day) || weekdays[0];
}

function formatDateForRoster(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return dateValue;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatClock(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getVehicle() {
  return vehicles.find((vehicle) => vehicle.id === state.vehicleId) || vehicles[0];
}

function isWheelchairVehicleRequired() {
  return getWheelchairCount() > 0 || Boolean(els.patientWheelchair?.checked);
}

function ensureVehicleCompatibility(options = {}) {
  if (!isWheelchairVehicleRequired()) return false;
  const vehicle = getVehicle();
  if (vehicle.wheelchair) return false;
  const nextVehicle = vehicles.find((item) => item.wheelchair);
  if (!nextVehicle) return false;

  state.vehicleId = nextVehicle.id;
  persist();
  if (options.status) {
    setStatus("車いす利用者がいるため、1号車または2号車のみ選択できます。");
  }
  return true;
}

function ensureVehicleCompatibilityForPatient(patient, options = {}) {
  if (!patient?.wheelchair) return false;
  const vehicle = getVehicle();
  if (vehicle.wheelchair) return false;
  const nextVehicle = vehicles.find((item) => item.wheelchair);
  if (!nextVehicle) return false;

  state.vehicleId = nextVehicle.id;
  persist();
  if (options.status) {
    setStatus("車いす利用者のため、1号車または2号車へ切り替えました。");
  }
  return true;
}

function getTotalPassengers() {
  return state.patients.reduce((sum, patient) => sum + Number(patient.passengers || 1), 0);
}

function getWheelchairCount() {
  return state.patients.filter((patient) => patient.wheelchair).length;
}

function getSeatedPassengers() {
  return state.patients.reduce((sum, patient) => {
    return patient.wheelchair ? sum : sum + Number(patient.passengers || 1);
  }, 0);
}

function getCapacitySummary(vehicle) {
  return `座席${getSeatedPassengers()}/${vehicle.capacity}・車いす${getWheelchairCount()}/${vehicle.wheelchairCapacity || 0}`;
}

function getCapacityMessage(vehicle) {
  if (getSeatedPassengers() > vehicle.capacity) return "座席定員超過";
  if (getWheelchairCount() > (vehicle.wheelchairCapacity || 0)) return "車いす台数超過";
  if (state.patients.some((patient) => patient.wheelchair) && !vehicle.wheelchair) return "車いす対応車を選択";
  return "定員内";
}

function formatWindow(patient) {
  if (patient.earliest && patient.latest) return `${patient.earliest}〜${patient.latest}`;
  if (patient.earliest) return `${patient.earliest}以降`;
  if (patient.latest) return `${patient.latest}まで`;
  return "時間指定なし";
}

function isSamePatientRecord(a, b) {
  return normalizeText(a?.name) === normalizeText(b?.name) &&
    normalizeText(a?.address) === normalizeText(b?.address);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function findKnownLocation(address) {
  const normalizedAddress = normalizeLocationKey(address);
  if (!normalizedAddress) return null;

  return knownLocations
    .flatMap((location) => getLocationKeys(location).map((key) => ({
      location,
      normalizedKey: normalizeLocationKey(key),
    })))
    .filter((item) => item.normalizedKey && normalizedAddress.includes(item.normalizedKey))
    .sort((a, b) => b.normalizedKey.length - a.normalizedKey.length)[0]?.location || null;
}

function getLocationKeys(location) {
  return [location.key, ...(location.aliases || [])].filter(Boolean);
}

function normalizeLocationKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-‒–—―ー−ｰ]/g, "")
    .replace(/\s+/g, "")
    .replace(/ヶ/g, "ケ");
}

function buildGeocodeQueries(address) {
  const text = String(address || "").trim();
  const queries = [normalizeKawasakiAddress(text)];
  const hasStationName = text.includes("駅");
  const hasMedicalName = looksLikeMedicalName(text);
  if (!hasStationName && !hasMedicalName && !looksLikeStreetAddress(text)) {
    queries.push(normalizeKawasakiAddress(`${text}駅`));
  }
  if (!looksLikeStreetAddress(text)) {
    getMedicalSearchNames(text).forEach((candidate) => queries.push(normalizeKawasakiAddress(candidate)));
  }
  return [...new Set(queries)];
}

function getMedicalSearchNames(text) {
  const medicalSuffixes = ["病院", "クリニック", "診療所", "医院"];
  if (looksLikeMedicalName(text)) return [text];
  return medicalSuffixes.map((suffix) => `${text}${suffix}`);
}

function looksLikeMedicalName(text) {
  return /病院|クリニック|診療所|医院|内科|外科|整形|皮膚科|眼科|耳鼻|歯科|小児科|泌尿器|透析|リハビリ|デイケア|薬局/.test(text);
}

function looksLikeStreetAddress(text) {
  return /[0-9０-９]|丁目|番|号|町|区|市|通|ビル|マンション|アパート/.test(text);
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
        serviceType: normalizeServiceType(saved.serviceType),
        useNowTime: saved.useNowTime !== false,
        autoRefresh: Boolean(saved.autoRefresh),
        vehicleId: saved.vehicleId || "car1",
        patients: Array.isArray(saved.patients) ? saved.patients : [],
        registeredPatients: Array.isArray(saved.registeredPatients) ? saved.registeredPatients : [],
        serviceDate: isIsoDate(saved.serviceDate) ? saved.serviceDate : getTodayIsoDate(),
        dailyPlans: normalizeDailyPlans(saved.dailyPlans),
        activeAppTab: ["plan", "map", "customers"].includes(saved.activeAppTab) ? saved.activeAppTab : "plan",
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return {
    startAddress: DEFAULT_BASE_ADDRESS,
    endAddress: DEFAULT_BASE_ADDRESS,
    startTime: "08:30",
    serviceType: "morning",
    useNowTime: true,
    autoRefresh: false,
    vehicleId: "car1",
    patients: [],
    registeredPatients: [],
    serviceDate: getTodayIsoDate(),
    dailyPlans: {},
    activeAppTab: "plan",
  };
}

function persist() {
  if (backendAvailable) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startAddress: state.startAddress,
      endAddress: state.endAddress,
      startTime: state.startTime,
      serviceType: state.serviceType,
      useNowTime: state.useNowTime,
      autoRefresh: state.autoRefresh,
      vehicleId: state.vehicleId,
      serviceDate: state.serviceDate,
      dailyPlans: state.dailyPlans,
      activeAppTab: state.activeAppTab,
      patients: [],
      registeredPatients: [],
    }));
    return;
  }
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
