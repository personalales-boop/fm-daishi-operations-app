const SESSION_KEY = "fm-daishi-session-v1";
const NOTIFY_KEY = "fm-daishi-notifications-v1";
const STATIC_STORE_KEY = "fm-daishi-static-store-v2";

const staticStaffMembers = [
  { id: "shimizu", code: "SH", name: "清水 暁", role: "パーソナリティ", abilities: ["P", "A"], color: "#1a73e8" },
  { id: "suyama", code: "SY", name: "須山 成美", role: "パーソナリティ", abilities: ["P1", "P", "M", "A", "MA"], color: "#ea4335" },
  { id: "sakamoto_tadashi", code: "SK", name: "坂本 匡", role: "パーソナリティ", abilities: ["P1", "P", "M", "MA"], color: "#fbbc04" },
  { id: "sakamoto_yumiko", code: "YS", name: "坂本 由美子", role: "パーソナリティ", abilities: ["P", "A"], color: "#34a853" },
  { id: "aoki", code: "AO", name: "青木 朋美", role: "パーソナリティ", abilities: ["P", "A"], color: "#4285f4" },
  { id: "madokawa", code: "MD", name: "窓川 唯良", role: "パーソナリティ", abilities: ["P", "A"], color: "#9c27b0" },
  { id: "sato_takashi", code: "ST", name: "佐藤 隆", role: "パーソナリティ", abilities: ["P1", "P", "M", "MA"], color: "#00acc1" },
  { id: "kaminaga", code: "KG", name: "神永 直樹", role: "パーソナリティ", abilities: ["P", "M", "A"], color: "#0f9d58" },
  { id: "tazawa", code: "TZ", name: "田沢 一郎", role: "パーソナリティ", abilities: ["P", "A"], color: "#ff7043" },
  { id: "uruchida", code: "UR", name: "粳田 浩介", role: "パーソナリティ", abilities: ["P", "A"], color: "#7cb342" },
  { id: "is", code: "IS", name: "IS（氏名未設定）", role: "パーソナリティ", abilities: ["P", "A"], color: "#5f6368" },
];

const staticShiftSlots = Array.from({ length: 9 }, (_, index) => {
  const hour = index + 9;
  return {
    id: `hour_${pad(hour)}`,
    label: `${pad(hour)}:00枠`,
    short: `${hour}時`,
    time: `${pad(hour)}:00-${pad(hour + 1)}:00`,
    className: "hour-slot",
  };
});

const staticInitialPins = {
  shimizu: "0000",
  suyama: "0001",
  sakamoto_tadashi: "1103",
  sakamoto_yumiko: "1104",
  aoki: "1105",
  madokawa: "1106",
  sato_takashi: "1107",
  kaminaga: "1108",
  tazawa: "1109",
  uruchida: "1110",
  is: "1111",
};

const staticAdminStaffIds = new Set(["shimizu", "suyama"]);
const staticLoginUsers = staticStaffMembers.map((staff) => ({
  id: staff.id,
  staffId: staff.id,
  name: staff.name,
  role: staff.role,
  permission: staticAdminStaffIds.has(staff.id) ? "admin" : "staff",
  pin: staticInitialPins[staff.id],
  color: staff.color,
})).concat([
  {
    id: "customer_demo",
    staffId: "",
    name: "お客様確認用",
    role: "閲覧専用",
    permission: "viewer",
    pin: "2222",
    color: "#5f6368",
  },
]);

let staffMembers = [];
let shiftSlots = [];
let loginUsers = [];
let scheduleMasters = {
  abilityDefinitions: [],
  staffAbilities: {},
  weeklyAvailability: [],
  originalPrograms: [],
};
let currentUser = null;
let authToken = "";
let staticMode = false;
let staticStoreCache = null;
let eventSource = null;
let lastAuditId = null;
let slotMasterSignature = "";
let focusedStaffId = null;
let pendingCsvImport = null;
let pendingMusicCsvImport = null;
let deferredInstallPrompt = null;
let boardFilter = "all";
let activeModule = "shift";
let activeShiftTab = "overview";
let selectedMusicDate = formatISO(new Date());
let musicSearchText = "";
let contentSearchText = "";
let documentSearchText = "";

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const postTypeLabels = {
  absence: "欠勤連絡",
  swapRequest: "交換依頼",
  swapConfirmed: "交換成立申請",
  notice: "連絡事項",
};
const statusLabels = {
  open: "未対応",
  pendingConsent: "相手承諾待ち",
  pendingApproval: "承認待ち",
  applied: "反映済み",
  rejected: "却下済み",
};
const availabilityLabels = {
  off: "希望休",
  available: "出勤可能",
  note: "勤務メモ",
};
const contentTypeLabels = {
  script: "動画台本",
  transcript: "話した内容",
  memo: "放送メモ",
};
const documentTypeLabels = {
  estimate: "見積書",
  delivery: "納品書",
  invoice: "請求書",
};
const documentStatusLabels = {
  draft: "下書き",
  ready: "送付待ち",
  sent: "送付済み",
  paid: "入金済み",
  cancelled: "取り下げ",
};

const state = {
  currentMonth: monthKey(new Date()),
  activeView: "draft",
  selectedDate: formatISO(new Date()),
  schedules: { draft: {}, final: {} },
  workflow: {},
  board: [],
  availability: [],
  staffProfiles: {},
  contentItems: [],
  musicLibrary: [],
  musicSchedule: {},
  businessDocuments: [],
  shiftSlots: [],
  auditLog: [],
  updatedAt: new Date().toISOString(),
  version: 0,
};

const els = {
  loginScreen: document.getElementById("loginScreen"),
  loginForm: document.getElementById("loginForm"),
  loginUser: document.getElementById("loginUser"),
  loginPin: document.getElementById("loginPin"),
  moduleTabs: document.querySelectorAll("[data-module]"),
  modulePanels: document.querySelectorAll("[data-module-panel]"),
  shiftTabs: document.querySelectorAll("[data-shift-tab]"),
  shiftPanels: document.querySelectorAll("[data-shift-panel]"),
  userBadge: document.getElementById("userBadge"),
  logoutButton: document.getElementById("logoutButton"),
  notifyButton: document.getElementById("notifyButton"),
  installButton: document.getElementById("installButton"),
  monthTitle: document.getElementById("monthTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarShell: document.querySelector(".calendar-shell"),
  statusStrip: document.getElementById("statusStrip"),
  topAssignmentList: document.getElementById("topAssignmentList"),
  boardList: document.getElementById("boardList"),
  shiftList: document.getElementById("shiftList"),
  personalShiftPanel: document.getElementById("personalShiftPanel"),
  personalShiftTitle: document.getElementById("personalShiftTitle"),
  boardForm: document.getElementById("boardForm"),
  boardFilterButtons: document.querySelectorAll("[data-board-filter]"),
  postType: document.getElementById("postType"),
  postDate: document.getElementById("postDate"),
  postSlot: document.getElementById("postSlot"),
  fromStaff: document.getElementById("fromStaff"),
  toStaff: document.getElementById("toStaff"),
  postMessage: document.getElementById("postMessage"),
  shiftForm: document.getElementById("shiftForm"),
  shiftDate: document.getElementById("shiftDate"),
  shiftSlot: document.getElementById("shiftSlot"),
  primaryStaff: document.getElementById("primaryStaff"),
  supportStaff: document.getElementById("supportStaff"),
  draftViewButton: document.getElementById("draftViewButton"),
  finalViewButton: document.getElementById("finalViewButton"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  todayButton: document.getElementById("todayButton"),
  shareDraftButton: document.getElementById("shareDraftButton"),
  finalizeButton: document.getElementById("finalizeButton"),
  autoDraftButton: document.getElementById("autoDraftButton"),
  exportButton: document.getElementById("exportButton"),
  backupButton: document.getElementById("backupButton"),
  resetButton: document.getElementById("resetButton"),
  aiPromptButton: document.getElementById("aiPromptButton"),
  templateButton: document.getElementById("templateButton"),
  importView: document.getElementById("importView"),
  importMode: document.getElementById("importMode"),
  csvImportFile: document.getElementById("csvImportFile"),
  csvPasteText: document.getElementById("csvPasteText"),
  previewCsvButton: document.getElementById("previewCsvButton"),
  csvPreviewList: document.getElementById("csvPreviewList"),
  importCsvButton: document.getElementById("importCsvButton"),
  printButton: document.getElementById("printButton"),
  copyTodayTomorrowButton: document.getElementById("copyTodayTomorrowButton"),
  copyMyShiftButton: document.getElementById("copyMyShiftButton"),
  myShiftList: document.getElementById("myShiftList"),
  availabilityForm: document.getElementById("availabilityForm"),
  availabilityStaff: document.getElementById("availabilityStaff"),
  availabilityDate: document.getElementById("availabilityDate"),
  availabilitySlot: document.getElementById("availabilitySlot"),
  availabilityType: document.getElementById("availabilityType"),
  availabilityNote: document.getElementById("availabilityNote"),
  availabilityList: document.getElementById("availabilityList"),
  slotMasterForm: document.getElementById("slotMasterForm"),
  automationMasterList: document.getElementById("automationMasterList"),
  saveSlotsButton: document.getElementById("saveSlotsButton"),
  staffProfileForm: document.getElementById("staffProfileForm"),
  profileStaff: document.getElementById("profileStaff"),
  profileContact: document.getElementById("profileContact"),
  profileSkills: document.getElementById("profileSkills"),
  profileUnavailable: document.getElementById("profileUnavailable"),
  todayHeading: document.getElementById("todayHeading"),
  todayList: document.getElementById("todayList"),
  lastUpdated: document.getElementById("lastUpdated"),
  issueList: document.getElementById("issueList"),
  staffCountList: document.getElementById("staffCountList"),
  approvalList: document.getElementById("approvalList"),
  auditList: document.getElementById("auditList"),
  workflowSettingsForm: document.getElementById("workflowSettingsForm"),
  draftDeadline: document.getElementById("draftDeadline"),
  finalDeadline: document.getElementById("finalDeadline"),
  monthlyNote: document.getElementById("monthlyNote"),
  saveWorkflowSettingsButton: document.getElementById("saveWorkflowSettingsButton"),
  syncStatus: document.getElementById("syncStatus"),
  musicMonthTitle: document.getElementById("musicMonthTitle"),
  musicCalendarViewButton: document.getElementById("musicCalendarViewButton"),
  musicLibraryViewButton: document.getElementById("musicLibraryViewButton"),
  musicKpiStrip: document.getElementById("musicKpiStrip"),
  musicCalendarGrid: document.getElementById("musicCalendarGrid"),
  musicPlaylistTitle: document.getElementById("musicPlaylistTitle"),
  musicPlaylistList: document.getElementById("musicPlaylistList"),
  musicLibraryList: document.getElementById("musicLibraryList"),
  musicSearch: document.getElementById("musicSearch"),
  musicGenerateForm: document.getElementById("musicGenerateForm"),
  musicGenerateDate: document.getElementById("musicGenerateDate"),
  musicTheme: document.getElementById("musicTheme"),
  musicCount: document.getElementById("musicCount"),
  copyMusicAiPromptButton: document.getElementById("copyMusicAiPromptButton"),
  exportMusicTemplateButton: document.getElementById("exportMusicTemplateButton"),
  exportMusicScheduleButton: document.getElementById("exportMusicScheduleButton"),
  musicTrackForm: document.getElementById("musicTrackForm"),
  trackCdCode: document.getElementById("trackCdCode"),
  trackTitle: document.getElementById("trackTitle"),
  trackArtist: document.getElementById("trackArtist"),
  trackGenre: document.getElementById("trackGenre"),
  trackSeason: document.getElementById("trackSeason"),
  trackMood: document.getElementById("trackMood"),
  musicCsvPasteText: document.getElementById("musicCsvPasteText"),
  previewMusicCsvButton: document.getElementById("previewMusicCsvButton"),
  musicCsvPreviewList: document.getElementById("musicCsvPreviewList"),
  importMusicCsvButton: document.getElementById("importMusicCsvButton"),
  musicIssueList: document.getElementById("musicIssueList"),
  contentKpiStrip: document.getElementById("contentKpiStrip"),
  contentSearch: document.getElementById("contentSearch"),
  contentIssueList: document.getElementById("contentIssueList"),
  contentList: document.getElementById("contentList"),
  contentForm: document.getElementById("contentForm"),
  contentDate: document.getElementById("contentDate"),
  contentProgram: document.getElementById("contentProgram"),
  contentType: document.getElementById("contentType"),
  contentTitle: document.getElementById("contentTitle"),
  contentTags: document.getElementById("contentTags"),
  contentSource: document.getElementById("contentSource"),
  contentBody: document.getElementById("contentBody"),
  contentTranscript: document.getElementById("contentTranscript"),
  copyContentAiPromptButton: document.getElementById("copyContentAiPromptButton"),
  copyContentOrganizePromptButton: document.getElementById("copyContentOrganizePromptButton"),
  exportContentCsvButton: document.getElementById("exportContentCsvButton"),
  documentKpiStrip: document.getElementById("documentKpiStrip"),
  documentSearch: document.getElementById("documentSearch"),
  documentList: document.getElementById("documentList"),
  documentForm: document.getElementById("documentForm"),
  documentType: document.getElementById("documentType"),
  documentIssueDate: document.getElementById("documentIssueDate"),
  documentDueDate: document.getElementById("documentDueDate"),
  documentClient: document.getElementById("documentClient"),
  documentContact: document.getElementById("documentContact"),
  documentTitle: document.getElementById("documentTitle"),
  documentAmount: document.getElementById("documentAmount"),
  documentStatus: document.getElementById("documentStatus"),
  documentFileRef: document.getElementById("documentFileRef"),
  documentMemo: document.getElementById("documentMemo"),
  saveDocumentsToDriveButton: document.getElementById("saveDocumentsToDriveButton"),
  exportDocumentsCsvButton: document.getElementById("exportDocumentsCsvButton"),
  toastRegion: document.getElementById("toastRegion"),
};

boot();

async function boot() {
  bindEvents();
  await loadConfig();
  populateControls();
  restoreSession();
  updateNotificationButton();
  registerServiceWorker();
  resetCsvPreview();
  resetMusicCsvPreview();
  updateInstallButton();

  if (!currentUser || !authToken) {
    showLogin();
    return;
  }

  try {
    await refreshState("initial");
    connectEvents();
    hideLogin();
  } catch (error) {
    logout(false);
    showLogin();
    toast(error.message || "ログインし直してください");
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.moduleTabs.forEach((button) => button.addEventListener("click", () => setActiveModule(button.dataset.module || "shift")));
  els.shiftTabs.forEach((button) => button.addEventListener("click", () => setActiveShiftTab(button.dataset.shiftTab || "overview")));
  els.logoutButton.addEventListener("click", () => logout(true));
  els.notifyButton.addEventListener("click", toggleNotifications);
  els.installButton.addEventListener("click", handleInstallClick);
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  window.addEventListener("online", () => setSyncStatus("オンラインに戻りました"));
  window.addEventListener("offline", () => setSyncStatus("オフラインです"));
  els.prevMonth.addEventListener("click", () => moveMonth(-1));
  els.nextMonth.addEventListener("click", () => moveMonth(1));
  els.todayButton.addEventListener("click", goToToday);
  els.draftViewButton.addEventListener("click", () => setActiveView("draft"));
  els.finalViewButton.addEventListener("click", () => setActiveView("final"));
  els.shareDraftButton.addEventListener("click", shareDraft);
  els.finalizeButton.addEventListener("click", finalizeShift);
  els.autoDraftButton.addEventListener("click", createAutoDraft);
  els.exportButton.addEventListener("click", exportCsv);
  els.backupButton.addEventListener("click", exportBackupJson);
  els.resetButton.addEventListener("click", resetDemo);
  els.copyTodayTomorrowButton.addEventListener("click", copyTodayTomorrowText);
  els.copyMyShiftButton.addEventListener("click", copyVisiblePersonalShiftText);
  els.aiPromptButton.addEventListener("click", copyAiPrompt);
  els.templateButton.addEventListener("click", exportAiTemplate);
  els.previewCsvButton.addEventListener("click", previewCsvSchedule);
  els.importCsvButton.addEventListener("click", importCsvSchedule);
  els.csvImportFile.addEventListener("change", resetCsvPreview);
  els.csvPasteText.addEventListener("input", resetCsvPreview);
  els.importView.addEventListener("change", resetCsvPreview);
  els.importMode.addEventListener("change", resetCsvPreview);
  els.printButton.addEventListener("click", () => window.print());
  els.availabilityForm.addEventListener("submit", handleAvailabilitySubmit);
  els.saveSlotsButton.addEventListener("click", saveSlotMaster);
  els.staffProfileForm.addEventListener("submit", saveStaffProfile);
  els.workflowSettingsForm.addEventListener("submit", saveWorkflowSettings);
  els.profileStaff.addEventListener("change", syncProfileForm);
  els.boardForm.addEventListener("submit", handleBoardSubmit);
  els.shiftForm.addEventListener("submit", handleShiftSubmit);
  els.shiftDate.addEventListener("change", () => setSelectedDate(els.shiftDate.value, false));
  els.shiftSlot.addEventListener("change", updateShiftFormFromSelection);
  els.calendarGrid.addEventListener("click", handleCalendarClick);
  els.calendarGrid.addEventListener("dblclick", handleStaffDoubleClick);
  document.addEventListener("click", handleCollapseToggle);
  els.boardFilterButtons.forEach((button) => button.addEventListener("click", handleBoardFilterClick));
  els.boardList.addEventListener("click", handleBoardAction);
  els.approvalList.addEventListener("click", handleBoardAction);
  els.musicCalendarViewButton.addEventListener("click", () => {
    els.musicCalendarViewButton.classList.add("active");
    els.musicLibraryViewButton.classList.remove("active");
    els.musicCalendarGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.musicLibraryViewButton.addEventListener("click", () => {
    els.musicLibraryViewButton.classList.add("active");
    els.musicCalendarViewButton.classList.remove("active");
    expandCollapsible("musicLibraryBody");
    els.musicLibraryList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.musicCalendarGrid.addEventListener("click", handleMusicCalendarClick);
  els.musicSearch.addEventListener("input", () => {
    musicSearchText = els.musicSearch.value.trim();
    renderMusicLibrary();
  });
  els.musicGenerateForm.addEventListener("submit", generateMusicSelection);
  els.copyMusicAiPromptButton.addEventListener("click", copyMusicAiPrompt);
  els.exportMusicTemplateButton.addEventListener("click", exportMusicTemplate);
  els.exportMusicScheduleButton.addEventListener("click", exportMusicScheduleCsv);
  els.musicTrackForm.addEventListener("submit", saveMusicTrack);
  els.previewMusicCsvButton.addEventListener("click", previewMusicCsv);
  els.importMusicCsvButton.addEventListener("click", importMusicCsv);
  els.musicCsvPasteText.addEventListener("input", resetMusicCsvPreview);
  els.contentSearch.addEventListener("input", () => {
    contentSearchText = els.contentSearch.value.trim();
    renderContentArchive();
  });
  els.contentForm.addEventListener("submit", saveContentItem);
  els.copyContentAiPromptButton.addEventListener("click", copyContentAiPrompt);
  els.copyContentOrganizePromptButton.addEventListener("click", copyContentOrganizePrompt);
  els.exportContentCsvButton.addEventListener("click", exportContentCsv);
  els.documentSearch.addEventListener("input", () => {
    documentSearchText = els.documentSearch.value.trim();
    renderDocumentList();
  });
  els.documentForm.addEventListener("submit", saveBusinessDocument);
  els.documentList.addEventListener("click", handleDocumentListClick);
  els.saveDocumentsToDriveButton.addEventListener("click", saveDocumentsToDrive);
  els.exportDocumentsCsvButton.addEventListener("click", exportDocumentsCsv);
}

async function loadConfig() {
  const config = await api("/api/config", { auth: false });
  staffMembers = config.staffMembers || [];
  shiftSlots = config.shiftSlots || [];
  loginUsers = config.users || [];
  scheduleMasters = normalizeScheduleMasters(config.scheduleMasters);
}

function populateControls() {
  clearSelect(els.loginUser);
  clearSelect(els.postSlot);
  clearSelect(els.shiftSlot);
  clearSelect(els.availabilitySlot);
  clearSelect(els.fromStaff);
  clearSelect(els.toStaff);
  clearSelect(els.primaryStaff);
  clearSelect(els.supportStaff);
  clearSelect(els.availabilityStaff);
  clearSelect(els.profileStaff);

  for (const user of loginUsers) {
    els.loginUser.append(new Option(`${user.name}（${permissionLabel(user)}）`, user.id));
  }

  els.availabilitySlot.append(new Option("終日", "all"));
  for (const slot of shiftSlots) {
    els.postSlot.append(new Option(`${slot.label} ${slot.time}`, slot.id));
    els.shiftSlot.append(new Option(`${slot.label} ${slot.time}`, slot.id));
    els.availabilitySlot.append(new Option(`${slot.label} ${slot.time}`, slot.id));
  }

  for (const staff of staffMembers) {
    els.fromStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
    els.toStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
    els.primaryStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
    els.supportStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
    els.availabilityStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
    els.profileStaff.append(new Option(`${staff.name}（${staff.role}）`, staff.id));
  }

  els.toStaff.prepend(new Option("未定", ""));
  els.supportStaff.prepend(new Option("未設定", ""));
  slotMasterSignature = "";
}

function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    authToken = session.token || "";
    currentUser = session.user || null;
  } catch {
    authToken = "";
    currentUser = null;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const result = await api("/api/login", {
      auth: false,
      method: "POST",
      body: {
        userId: els.loginUser.value,
        pin: els.loginPin.value,
      },
    });
    authToken = result.token;
    currentUser = result.user;
    focusedStaffId = null;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: authToken, user: currentUser }));
    els.loginPin.value = "";
    await refreshState("initial");
    connectEvents();
    hideLogin();
    toast(`${currentUser.name}さんでログインしました`);
  } catch (error) {
    toast(error.message || "ログインできませんでした");
  }
}

function logout(showMessage) {
  if (eventSource) eventSource.close();
  eventSource = null;
  authToken = "";
  currentUser = null;
  focusedStaffId = null;
  localStorage.removeItem(SESSION_KEY);
  showLogin();
  if (showMessage) toast("ログアウトしました");
}

function showLogin() {
  document.body.classList.add("is-locked");
  els.loginScreen.hidden = false;
  els.userBadge.textContent = "未ログイン";
}

function hideLogin() {
  document.body.classList.remove("is-locked");
  els.loginScreen.hidden = true;
}

async function refreshState(reason) {
  const previousAuditId = state.auditLog[0]?.id || lastAuditId;
  const payload = await api(`/api/state?month=${encodeURIComponent(state.currentMonth)}`);
  Object.assign(state, payload.state, {
    currentMonth: state.currentMonth,
    activeView: state.activeView,
    selectedDate: state.selectedDate,
  });
  syncReferenceDataFromState();
  ensureLocalMonth(state.currentMonth);
  if (!state.selectedDate.startsWith(state.currentMonth)) {
    state.selectedDate = getDefaultSelectedDate(state.currentMonth);
  }
  render();

  const newestAudit = state.auditLog[0];
  if (reason === "event" && newestAudit && newestAudit.id !== previousAuditId) {
    const message = `${newestAudit.actorName}: ${newestAudit.action}`;
    toast(message);
    notify("FM大師 シフト更新", newestAudit.detail || message);
  }
  lastAuditId = newestAudit?.id || lastAuditId;
}

function connectEvents() {
  if (eventSource) eventSource.close();
  if (staticMode) {
    eventSource = null;
    setSyncStatus("納品確認用の静的公開版です");
    return;
  }
  eventSource = new EventSource(`/api/events?token=${encodeURIComponent(authToken)}`);
  eventSource.addEventListener("connected", () => setSyncStatus("リアルタイム同期中"));
  eventSource.addEventListener("update", () => refreshState("event").catch((error) => setSyncStatus(error.message)));
  eventSource.onerror = () => setSyncStatus("再接続中");
}

function render() {
  ensureLocalMonth(state.currentMonth);
  if (currentUser && !isAdmin()) {
    const workflow = state.workflow[state.currentMonth] || {};
    state.activeView = workflow.finalizedAt ? "final" : "draft";
  }
  renderHeader();
  renderStatus();
  renderTopAssignments();
  renderCalendar();
  renderShiftList();
  renderBoard();
  renderToday();
  renderShiftIssues();
  renderStaffCounts();
  renderMyShifts();
  renderAvailabilityList();
  renderApprovals();
  renderSlotMaster();
  renderAutomationMasters();
  renderProfilePanel();
  renderWorkflowSettings();
  renderAuditLog();
  renderMusicDashboard();
  renderContentDashboard();
  renderDocumentDashboard();
  syncForms();
  applyPermissions();
  applyModuleVisibility();
}

function renderHeader() {
  const { year, monthIndex } = parseMonth(state.currentMonth);
  els.monthTitle.textContent = `${year}年${monthIndex + 1}月`;
  els.draftViewButton.classList.toggle("active", state.activeView === "draft");
  els.finalViewButton.classList.toggle("active", state.activeView === "final");
  els.userBadge.textContent = currentUser
    ? `${currentUser.name} / ${permissionLabel(currentUser)}`
    : "未ログイン";
}

function renderStatus() {
  const workflow = state.workflow[state.currentMonth] || {};
  const pendingCount = getPendingApprovals().length;
  const openCount = state.board.filter((post) => {
    return post.date?.startsWith(state.currentMonth) && ["open", "pendingConsent", "pendingApproval"].includes(post.status) && post.type !== "notice";
  }).length;
  const finalStatus = workflow.finalizedAt ? formatDateTime(workflow.finalizedAt) : "未確定";
  const sharedStatus = workflow.draftSharedAt ? formatDateTime(workflow.draftSharedAt) : workflow.draftDeadline ? `予定 ${formatDateShort(workflow.draftDeadline)}` : "未共有";
  const sharedLabel = workflow.draftSharedAt ? "共有済み" : workflow.draftDeadline ? "共有予定" : "未共有";
  const finalLabel = workflow.finalizedAt ? "確定済み" : workflow.finalDeadline ? "締切あり" : "未確定";
  const sharedMeta = workflow.draftSharedAt ? formatDateTime(workflow.draftSharedAt) : workflow.draftDeadline ? `予定 ${formatDateShort(workflow.draftDeadline)}` : "";
  const finalMeta = workflow.finalizedAt ? formatDateTime(workflow.finalizedAt) : workflow.finalDeadline ? `締切 ${formatDateShort(workflow.finalDeadline)}` : "";
  const viewLabel = state.activeView === "draft" ? "仮シフト" : "確定シフト";

  const cards = isAdmin()
    ? [
        statusCard("表示中", viewLabel, "warning", `要対応 ${openCount}件`),
        statusCard("承認待ち", `${pendingCount}件`, "warning", "交換申請"),
        statusCard("仮シフト共有", sharedLabel, "", sharedMeta),
        statusCard("確定シフト", finalLabel, "final", finalMeta),
      ]
    : [
        statusCard("表示中", viewLabel, "warning"),
        statusCard("シフト状態", workflow.finalizedAt ? "確定済み" : "仮シフト", "", workflow.finalizedAt ? finalStatus : sharedStatus),
        statusCard("連絡事項", `${openCount}件`, "final"),
      ];

  els.statusStrip.innerHTML = cards.join("");
}

function statusCard(label, value, tone = "", meta = "") {
  return `
    <div class="status-item ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </div>
  `;
}

function renderCalendar() {
  const visibleDates = getCalendarDates(state.currentMonth);
  const schedule = getVisibleSchedule(state.activeView, state.currentMonth);
  const todayIso = formatISO(new Date());
  const alertDates = new Set(
    state.board
      .filter((post) => ["open", "pendingConsent", "pendingApproval"].includes(post.status) && post.type !== "notice")
      .map((post) => post.date),
  );

  els.calendarGrid.innerHTML = visibleDates
    .map((date) => {
      const iso = formatISO(date);
      const inMonth = iso.startsWith(state.currentMonth);
      const daySchedule = schedule[iso] || {};
      const classes = [
        "day-card",
        inMonth ? "" : "is-muted",
        iso === todayIso ? "is-today" : "",
        iso === state.selectedDate ? "is-selected" : "",
        alertDates.has(iso) ? "has-alert" : "",
        shiftSlots.length >= 7 ? "has-hourly-slots" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <article class="${classes}" data-date="${iso}" tabindex="0" aria-label="${formatDateForSpeech(iso)}のシフト">
          <div class="day-head">
            <span class="date-number">${date.getDate()}</span>
            <span class="day-badge">${weekdayLabels[date.getDay()]}</span>
          </div>
          <div class="slot-list">
            ${shiftSlots.map((slot) => renderShiftRow(slot, daySchedule[slot.id] || [], iso)).join("")}
          </div>
        </article>
      `;
    })
    .join("");

  keepSelectedDayVisible();
}

function renderShiftRow(slot, staffIds, date) {
  const program = getOriginalProgramForDateSlot(date, slot);
  const chipHtml = staffIds.length
    ? staffIds.map((id) => renderStaffChip(id, date, slot.id)).join("")
    : `<span class="empty-slot">未設定</span>`;

  return `
    <div class="shift-row ${program ? "has-program" : ""}">
      <span class="slot-code ${slot.className}">${escapeHtml(slot.short)}</span>
      <div class="staff-stack">
        ${program ? `<span class="program-mini">${escapeHtml(program.title)}</span>` : ""}
        ${chipHtml}
      </div>
    </div>
  `;
}

function renderStaffChip(id, date, slotId) {
  const staff = getStaff(id);
  if (!staff) return "";
  const classes = [
    "staff-chip",
    id === currentUser?.staffId ? "is-own" : "",
    id === focusedStaffId ? "is-focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <span class="${classes}" title="${escapeHtml(staff.role)} / 自分の名前はクリックで交代依頼、ダブルクリックで今月の担当を表示" role="button" tabindex="0" data-staff-id="${escapeHtml(staff.id)}" data-date="${escapeHtml(date || "")}" data-slot-id="${escapeHtml(slotId || "")}">
      <span class="staff-dot" style="--dot: ${staff.color}"></span>
      ${escapeHtml(staff.name)}
      ${id === currentUser?.staffId ? `<span class="own-marker">自分</span>` : ""}
    </span>
  `;
}

function renderBoard() {
  const monthPosts = state.board
    .filter((post) => post.date?.startsWith(state.currentMonth))
    .filter((post) => {
      if (boardFilter === "open") return ["open", "pendingConsent", "pendingApproval"].includes(post.status) && post.type !== "notice";
      if (boardFilter === "mine") return [post.fromStaff, post.toStaff, post.createdBy].includes(currentUser?.staffId) || post.createdBy === currentUser?.id;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.boardFilterButtons.forEach((button) => button.classList.toggle("active", button.dataset.boardFilter === boardFilter));

  if (!monthPosts.length) {
    els.boardList.innerHTML = `<div class="board-item notice"><p class="board-message">表示できる掲示板投稿はありません。</p></div>`;
    return;
  }

  els.boardList.innerHTML = monthPosts.map(renderBoardItem).join("");
}

function renderBoardItem(post) {
  const slot = getSlot(post.slot);
  const from = getStaff(post.fromStaff);
  const to = getStaff(post.toStaff);
  const action = renderPostActions(post);
  const statusClass = statusClassName(post.status);

  return `
    <article class="board-item ${post.type} ${statusClass} ${post.status}">
      <div>
        <div class="board-meta">
          <span>${escapeHtml(postTypeLabels[post.type] || "連絡")}</span>
          <span>${escapeHtml(formatDateShort(post.date))}</span>
          <span>${escapeHtml(slot ? `${slot.label} ${slot.time}` : "担当枠なし")}</span>
          <span>${escapeHtml(formatDateTime(post.createdAt))}</span>
          <span class="status-badge ${statusClass}">${escapeHtml(statusLabels[post.status] || "未対応")}</span>
        </div>
        <p class="board-title">${escapeHtml(buildPostTitle(post, from, to, slot))}</p>
        <p class="board-message">${escapeHtml(post.message || buildDefaultMessage(post))}</p>
      </div>
      ${action}
    </article>
  `;
}

function renderPostActions(post) {
  if (post.status === "pendingConsent" && canConsentSwap(post)) {
    return `
      <div class="board-actions">
        <button class="small-button approve" data-consent="${post.id}" type="button">承諾して確認へ</button>
        <button class="small-button reject" data-decline="${post.id}" type="button">辞退</button>
      </div>
    `;
  }

  if (post.status === "pendingApproval" && isAdmin()) {
    return `
      <div class="board-actions">
        <button class="small-button approve" data-approve="${post.id}" type="button">承認して反映</button>
        <button class="small-button reject" data-reject="${post.id}" type="button">却下</button>
      </div>
    `;
  }

  if (post.status === "applied") {
    return `<div class="board-actions"><button class="small-button applied" type="button" disabled>反映済み</button></div>`;
  }

  if (post.status === "rejected") {
    return `<div class="board-actions"><button class="small-button applied" type="button" disabled>却下済み</button></div>`;
  }

  return "";
}

function renderShiftList() {
  const schedule = getVisibleSchedule(state.activeView, state.currentMonth);
  const dates = Object.keys(schedule).filter((date) => date.startsWith(state.currentMonth)).sort();

  if (!dates.length) {
    els.shiftList.innerHTML = `<div class="shift-list-item"><strong>表示できるシフトがありません</strong><span>月を切り替えると自動で作成されます。</span></div>`;
    return;
  }

  els.shiftList.innerHTML = dates
    .map((date) => {
      const daySchedule = schedule[date] || {};
      const own = currentUser?.staffId && shiftSlots.some((slot) => (daySchedule[slot.id] || []).includes(currentUser.staffId));
      const rows = shiftSlots
        .map((slot) => {
          const names =
            (daySchedule[slot.id] || [])
              .map((id) => getStaff(id)?.name)
              .filter(Boolean)
              .join(" / ") || "未設定";
          return `${slot.short}: ${names}`;
        })
        .join("　");

      return `
        <article class="shift-list-item ${own ? "is-own" : ""}">
          <strong>${escapeHtml(formatDateShort(date))}${own ? " / 自分の担当あり" : ""}</strong>
          <span>${escapeHtml(rows)}</span>
        </article>
      `;
    })
    .join("");
}

function renderToday() {
  const today = new Date();
  const todayIso = formatISO(today);
  const todayMonth = monthKey(today);
  ensureLocalMonth(todayMonth);
  const workflow = state.workflow[todayMonth] || {};
  const scheduleKey = workflow.finalizedAt ? "final" : "draft";
  const schedule = state.schedules[scheduleKey]?.[todayMonth] || state.schedules.draft[todayMonth] || {};
  const daySchedule = schedule[todayIso] || {};

  els.todayHeading.textContent = `${formatDateShort(todayIso)}（${workflow.finalizedAt ? "確定" : "仮"}）`;
  els.todayList.innerHTML = shiftSlots
    .map((slot) => {
      const names = (daySchedule[slot.id] || [])
        .map((id) => getStaff(id)?.name)
        .filter(Boolean)
        .join("、") || "未設定";
      return `
        <div class="today-row">
          <strong>${escapeHtml(slot.short)}</strong>
          <span title="${escapeHtml(slot.label)}">${escapeHtml(names)}</span>
        </div>
      `;
    })
    .join("");

  els.lastUpdated.textContent = `最終更新: ${formatDateTime(state.updatedAt)}`;
}

function renderTopAssignments() {
  const dates = [new Date(), addDays(new Date(), 1)].map((date) => formatISO(date));
  els.topAssignmentList.innerHTML = dates
    .map((date, index) => {
      const month = monthKey(parseISO(date));
      ensureLocalMonth(month);
      const workflow = state.workflow[month] || {};
      const scheduleKey = workflow.finalizedAt ? "final" : "draft";
      const schedule = state.schedules[scheduleKey]?.[month] || state.schedules.draft[month] || {};
      const daySchedule = schedule[date] || {};
      const rows = shiftSlots
        .map((slot) => {
          const names =
            (daySchedule[slot.id] || [])
              .map((id) => getStaff(id)?.name)
              .filter(Boolean)
              .join("、") || "未設定";
          return `<span><strong>${escapeHtml(slot.short)}</strong>${escapeHtml(names)}</span>`;
        })
        .join("");

      return `
        <article class="top-assignment-card ${index === 0 ? "today" : ""}">
          <strong>${index === 0 ? "今日" : "明日"} ${escapeHtml(formatDateShort(date))}</strong>
          <div>${rows}</div>
        </article>
      `;
    })
    .join("");
}

function renderShiftIssues() {
  const issues = analyzeSchedule(getVisibleSchedule(state.activeView, state.currentMonth), state.currentMonth);
  if (!issues.length) {
    els.issueList.innerHTML = `<div class="issue-item good"><strong>大きな警告はありません</strong><span>希望休、重複、連続勤務を確認済みです。</span></div>`;
    return;
  }

  els.issueList.innerHTML = issues
    .slice(0, 10)
    .map((issue) => `
      <article class="issue-item ${escapeHtml(issue.level)}">
        <strong>${escapeHtml(issue.title)}</strong>
        <span>${escapeHtml(issue.detail)}</span>
      </article>
    `)
    .join("");
}

function renderStaffCounts() {
  const counts = getStaffMonthlyCounts(getVisibleSchedule(state.activeView, state.currentMonth), state.currentMonth);
  if (!counts.length) {
    els.staffCountList.innerHTML = `<div class="staff-count-item"><strong>集計できるシフトがありません</strong><span>シフトが入ると担当回数を表示します。</span></div>`;
    return;
  }

  els.staffCountList.innerHTML = counts
    .map((item) => {
      const staff = getStaff(item.staffId);
      const slotHtml = shiftSlots
        .map((slot) => {
          const count = item.slots[slot.id] || 0;
          return `
          <span class="slot-count-chip ${count ? "" : "is-zero"}">
            <b>${escapeHtml(slot.short)}</b>
            <em>${count}</em>
          </span>
        `;
        })
        .join("");
      return `
        <article class="staff-count-item ${item.staffId === currentUser?.staffId ? "is-own" : ""}">
          <strong>${escapeHtml(staff?.name || item.staffId)} <em>${item.total}回</em></strong>
          <div class="slot-count-grid">${slotHtml}</div>
        </article>
      `;
    })
    .join("");
}

function renderMyShifts() {
  const staffId = focusedStaffId || currentUser?.staffId;
  const targetStaff = getStaff(staffId);
  if (els.personalShiftTitle) {
    els.personalShiftTitle.textContent = focusedStaffId && targetStaff
      ? `${targetStaff.name}さんのシフト`
      : "自分のシフト";
  }
  els.personalShiftPanel?.classList.toggle("has-focused-staff", Boolean(focusedStaffId));

  if (currentUser?.permission === "viewer" && !focusedStaffId) {
    els.myShiftList.innerHTML = `<div class="my-shift-item"><strong>閲覧専用ログインです</strong><span>カレンダー上のスタッフ名をダブルクリックすると、その人の今月の担当を確認できます。</span></div>`;
    return;
  }

  if (!staffId) {
    els.myShiftList.innerHTML = `<div class="my-shift-item"><strong>ログイン後に表示します</strong><span>自分の担当日だけを一覧にします。</span></div>`;
    return;
  }

  const schedule = getVisibleSchedule(state.activeView, state.currentMonth);
  const items = [];
  Object.keys(schedule)
    .filter((date) => date.startsWith(state.currentMonth))
    .sort()
    .forEach((date) => {
      shiftSlots.forEach((slot) => {
        const staffIds = schedule[date]?.[slot.id] || [];
        if (!staffIds.includes(staffId)) return;
        const partnerNames =
          staffIds
            .filter((id) => id !== staffId)
            .map((id) => getStaff(id)?.name)
            .filter(Boolean)
            .join("、") || "単独";
        items.push({ date, slot, partnerNames });
      });
    });

  if (!items.length) {
    els.myShiftList.innerHTML = `${renderPersonalShiftFocus(targetStaff, 0)}<div class="my-shift-item"><strong>今月の担当はありません</strong><span>${escapeHtml(targetStaff?.name || "スタッフ")} / ${escapeHtml(state.activeView === "draft" ? "仮シフト" : "確定シフト")}で表示しています。</span></div>`;
    return;
  }

  els.myShiftList.innerHTML =
    renderPersonalShiftFocus(targetStaff, items.length) +
    items
      .map((item) => `
      <article class="my-shift-item">
        <strong>${escapeHtml(formatDateShort(item.date))} ${escapeHtml(item.slot.label)} ${escapeHtml(item.slot.time)}</strong>
        <span>一緒に入る人: ${escapeHtml(item.partnerNames)}</span>
      </article>
    `)
      .join("");
}

function renderPersonalShiftFocus(staff, itemCount) {
  if (!focusedStaffId || !staff) return "";
  return `
    <div class="my-shift-focus">
      <strong>カレンダーで選択中: ${escapeHtml(staff.name)}さん</strong>
      <span>この欄に${escapeHtml(state.currentMonth)}の担当 ${itemCount}件を表示しています。</span>
    </div>
  `;
}

function renderApprovals() {
  const pending = getPendingApprovals();
  if (!pending.length) {
    els.approvalList.innerHTML = `<div class="approval-item"><strong>承認待ちはありません</strong><span>交換成立申請が投稿されるとここに表示されます。</span></div>`;
    return;
  }

  els.approvalList.innerHTML = pending
    .map((post) => {
      const slot = getSlot(post.slot);
      const from = getStaff(post.fromStaff);
      const to = getStaff(post.toStaff);
      const actionHtml =
        post.status === "pendingConsent"
          ? `<div class="approval-actions">
              <button class="small-button approve" data-consent="${post.id}" type="button">承諾済みに進める</button>
              <button class="small-button reject" data-decline="${post.id}" type="button">辞退扱い</button>
            </div>`
          : `<div class="approval-actions">
              <button class="small-button approve" data-approve="${post.id}" type="button">承認</button>
              <button class="small-button reject" data-reject="${post.id}" type="button">却下</button>
            </div>`;
      return `
        <article class="approval-item">
          <strong>${escapeHtml(formatDateShort(post.date))} ${escapeHtml(slot?.short || "")}: ${escapeHtml(from?.name || "")} → ${escapeHtml(to?.name || "")}</strong>
          <span>${escapeHtml(statusLabels[post.status] || "")} / ${escapeHtml(slot?.label || "")} / ${escapeHtml(post.createdByName || "投稿者不明")} / ${escapeHtml(formatDateTime(post.createdAt))}</span>
          ${isAdmin() ? actionHtml : ""}
        </article>
      `;
    })
    .join("");
}

function renderAvailabilityList() {
  const items = (state.availability || [])
    .filter((item) => item.date?.startsWith(state.currentMonth))
    .filter((item) => isAdmin() || item.staffId === currentUser?.staffId)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.slot).localeCompare(String(b.slot)));

  if (!items.length) {
    els.availabilityList.innerHTML = `<div class="availability-item"><strong>希望はまだありません</strong><span>休みや出勤可能日を登録するとここに残ります。</span></div>`;
    return;
  }

  els.availabilityList.innerHTML = items
    .slice(0, 14)
    .map((item) => {
      const staff = getStaff(item.staffId);
      const slot = item.slot === "all" ? "終日" : getSlot(item.slot)?.label || item.slot;
      return `
        <article class="availability-item ${escapeHtml(item.type)}">
          <strong>${escapeHtml(formatDateShort(item.date))} ${escapeHtml(slot)} / ${escapeHtml(availabilityLabels[item.type] || "希望")}</strong>
          <span>${escapeHtml(staff?.name || "スタッフ")} ${item.note ? `: ${escapeHtml(item.note)}` : ""}</span>
        </article>
      `;
    })
    .join("");
}

function renderSlotMaster() {
  if (!isAdmin()) return;
  const signature = JSON.stringify(shiftSlots);
  if (slotMasterSignature === signature && els.slotMasterForm.children.length) return;

  slotMasterSignature = signature;
  const rows = [
    ...shiftSlots,
    { id: "", label: "", short: "", time: "", className: "" },
  ];

  els.slotMasterForm.innerHTML = rows
    .map((slot, index) => `
      <div class="slot-master-row" data-slot-index="${index}">
        <div class="field-group">
          <label>ID</label>
          <input data-field="id" value="${escapeHtml(slot.id)}" placeholder="hour_09" />
        </div>
        <div class="field-group">
          <label>名称</label>
          <input data-field="label" value="${escapeHtml(slot.label)}" placeholder="09:00枠" />
        </div>
        <div class="field-group">
          <label>短縮</label>
          <input data-field="short" value="${escapeHtml(slot.short)}" placeholder="9時" />
        </div>
        <div class="field-group">
          <label>時間</label>
          <input data-field="time" value="${escapeHtml(slot.time)}" placeholder="08:00-10:00" />
        </div>
      </div>
    `)
    .join("");
}

function renderAutomationMasters() {
  if (!els.automationMasterList || !isAdmin()) return;
  const availabilityCount = scheduleMasters.weeklyAvailability.length;
  const programCount = scheduleMasters.originalPrograms.length;
  const abilityText = scheduleMasters.abilityDefinitions
    .map((item) => `${item.code}: ${item.name}`)
    .join(" / ");
  const availabilityByWeekday = weekdayLabels
    .map((label, weekday) => {
      const rows = scheduleMasters.weeklyAvailability
        .filter((item) => Number(item.weekday) === weekday)
        .map((item) => `${item.staffCode} ${item.hours.map((hour) => `${hour}時`).join(",")}`)
        .join(" / ");
      return rows ? `<span><strong>${escapeHtml(label)}</strong>${escapeHtml(rows)}</span>` : "";
    })
    .filter(Boolean)
    .join("");
  const programPreview = scheduleMasters.originalPrograms
    .slice(0, 6)
    .map((program) => {
      const assignments = Object.entries(program.assignments || {})
        .map(([ability, code]) => `${ability}:${code}`)
        .join(" ");
      return `<li>${escapeHtml(program.weekdayLabel)} ${escapeHtml(program.weekRule)} ${escapeHtml(program.hour)}時 / ${escapeHtml(assignments)} / ${escapeHtml(program.title)}</li>`;
    })
    .join("");

  els.automationMasterList.innerHTML = `
    <div class="master-summary-item">
      <strong>時間枠</strong>
      <span>${escapeHtml(shiftSlots.map((slot) => slot.short).join("、"))}</span>
    </div>
    <div class="master-summary-item">
      <strong>能力記号</strong>
      <span>${escapeHtml(abilityText || "未登録")}</span>
    </div>
    <div class="master-summary-item">
      <strong>稼働可能時間 ${availabilityCount}件</strong>
      <div class="weekday-availability">${availabilityByWeekday || "<span>未登録</span>"}</div>
    </div>
    <div class="master-summary-item">
      <strong>オリジナル番組 ${programCount}件</strong>
      <ul>${programPreview || "<li>未登録</li>"}</ul>
    </div>
  `;
}

function renderProfilePanel() {
  if (!isAdmin()) return;
  if (!els.profileStaff.value) {
    els.profileStaff.value = currentUser?.staffId || staffMembers[0]?.id || "";
    syncProfileForm();
  }
}

function renderWorkflowSettings() {
  if (!isAdmin()) return;
  const workflow = state.workflow[state.currentMonth] || {};
  const active = document.activeElement;
  if ([els.draftDeadline, els.finalDeadline, els.monthlyNote].includes(active)) return;
  els.draftDeadline.value = workflow.draftDeadline || "";
  els.finalDeadline.value = workflow.finalDeadline || "";
  els.monthlyNote.value = workflow.monthlyNote || "";
}

function renderAuditLog() {
  const items = state.auditLog.slice(0, 8);
  if (!items.length) {
    els.auditList.innerHTML = `<div class="audit-item"><strong>履歴はまだありません</strong><span>共有、承認、編集などの操作が記録されます。</span></div>`;
    return;
  }

  els.auditList.innerHTML = items
    .map((item) => `
      <article class="audit-item">
        <strong>${escapeHtml(item.action)}</strong>
        <span>${escapeHtml(item.detail)}</span>
        <span>${escapeHtml(item.actorName)} / ${escapeHtml(formatDateTime(item.createdAt))}</span>
      </article>
    `)
    .join("");
}

function renderMusicDashboard() {
  if (!els.musicCalendarGrid) return;
  if (!selectedMusicDate.startsWith(state.currentMonth)) {
    selectedMusicDate = getDefaultSelectedDate(state.currentMonth);
  }
  const { year, monthIndex } = parseMonth(state.currentMonth);
  els.musicMonthTitle.textContent = `${year}年${monthIndex + 1}月`;
  renderMusicKpis();
  renderMusicCalendar();
  renderMusicPlaylist();
  renderMusicLibrary();
  renderMusicIssues();
}

function renderMusicKpis() {
  const monthSchedule = state.musicSchedule?.[state.currentMonth] || {};
  const scheduledDays = Object.keys(monthSchedule).length;
  const scheduledTracks = Object.values(monthSchedule).reduce((sum, selection) => sum + (selection.trackIds?.length || 0), 0);
  els.musicKpiStrip.innerHTML = [
    statusCard("CD台帳", `${state.musicLibrary.length}曲`, "final"),
    statusCard("今月の選曲日", `${scheduledDays}日`, "warning"),
    statusCard("今月の予定曲", `${scheduledTracks}曲`, ""),
    statusCard("季節テーマ", inferLocalSeasonTheme(state.currentMonth), "final"),
  ].join("");
}

function renderMusicCalendar() {
  const visibleDates = getCalendarDates(state.currentMonth);
  const monthSchedule = state.musicSchedule?.[state.currentMonth] || {};
  const todayIso = formatISO(new Date());

  els.musicCalendarGrid.innerHTML = visibleDates
    .map((date) => {
      const iso = formatISO(date);
      const selection = monthSchedule[iso];
      const tracks = getSelectionTracks(selection).slice(0, 5);
      const classes = [
        "day-card",
        "music-day-card",
        iso.startsWith(state.currentMonth) ? "" : "is-muted",
        iso === todayIso ? "is-today" : "",
        iso === selectedMusicDate ? "is-selected" : "",
        selection ? "has-music" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const trackHtml = tracks.length
        ? tracks.map((track, index) => `<li><strong>${index + 1}</strong>${escapeHtml(track.title)}</li>`).join("")
        : `<li class="empty-music">未作成</li>`;

      return `
        <article class="${classes}" data-music-date="${iso}" tabindex="0" aria-label="${formatDateForSpeech(iso)}の選曲">
          <div class="day-head">
            <span class="date-number">${date.getDate()}</span>
            <span class="day-badge">${weekdayLabels[date.getDay()]}</span>
          </div>
          <div class="music-day-summary">
            <strong>${selection ? `${selection.trackIds?.length || 0}曲` : "選曲なし"}</strong>
            <span>${escapeHtml(selection?.theme || inferLocalSeasonTheme(iso))}</span>
          </div>
          <ol class="music-mini-list">${trackHtml}</ol>
        </article>
      `;
    })
    .join("");
}

function renderMusicPlaylist() {
  const selection = state.musicSchedule?.[monthKey(parseISO(selectedMusicDate))]?.[selectedMusicDate];
  const tracks = getSelectionTracks(selection);
  els.musicGenerateDate.value = selectedMusicDate;
  els.musicPlaylistTitle.textContent = `${formatDateShort(selectedMusicDate)} 選曲リスト`;

  if (!tracks.length) {
    els.musicPlaylistList.innerHTML = `<div class="playlist-item muted"><strong>この日の選曲は未作成です</strong><span>右側の「テーマから作成」で30曲の候補を作れます。</span></div>`;
    return;
  }

  els.musicPlaylistList.innerHTML = tracks
    .map((track, index) => `
      <article class="playlist-item">
        <strong>${index + 1}. ${escapeHtml(track.title)} <em>${escapeHtml(track.artist || "")}</em></strong>
        <span>${escapeHtml([track.cdCode, track.trackNo ? `Track ${track.trackNo}` : "", track.genre, track.season, track.mood].filter(Boolean).join(" / "))}</span>
        <span>${escapeHtml((track.themes || []).join("、") || track.notes || "")}</span>
      </article>
    `)
    .join("");
}

function renderMusicLibrary() {
  const query = normalizeSearchText(musicSearchText);
  const tracks = (state.musicLibrary || [])
    .filter((track) => {
      if (!query) return true;
      return normalizeSearchText([track.title, track.artist, track.cdCode, track.genre, track.season, track.mood, ...(track.themes || [])].join(" ")).includes(query);
    })
    .slice(0, 80);

  if (!tracks.length) {
    els.musicLibraryList.innerHTML = `<div class="library-item"><strong>該当する楽曲がありません</strong><span>CD台帳を登録するとここに表示されます。</span></div>`;
    return;
  }

  els.musicLibraryList.innerHTML = tracks
    .map((track) => `
      <article class="library-item">
        <strong>${escapeHtml(track.title)} <em>${escapeHtml(track.artist || "")}</em></strong>
        <span>${escapeHtml([track.cdCode, track.shelf ? `棚 ${track.shelf}` : "", track.trackNo ? `Track ${track.trackNo}` : "", track.genre].filter(Boolean).join(" / "))}</span>
        <span>${escapeHtml([track.season, track.mood, ...(track.themes || [])].filter(Boolean).join("、"))}</span>
      </article>
    `)
    .join("");
}

function renderMusicIssues() {
  const issues = analyzeMusicSchedule();
  if (!issues.length) {
    els.musicIssueList.innerHTML = `<div class="issue-item good"><strong>大きな警告はありません</strong><span>直近の重複と曲数を確認しました。</span></div>`;
    return;
  }

  els.musicIssueList.innerHTML = issues
    .slice(0, 10)
    .map((issue) => `
      <article class="issue-item ${escapeHtml(issue.level)}">
        <strong>${escapeHtml(issue.title)}</strong>
        <span>${escapeHtml(issue.detail)}</span>
      </article>
    `)
    .join("");
}

function renderContentDashboard() {
  renderContentKpis();
  renderContentIssues();
  renderContentArchive();
}

function renderContentKpis() {
  const items = state.contentItems || [];
  const thisMonthItems = items.filter((item) => item.date?.startsWith(state.currentMonth));
  const transcripts = items.filter((item) => item.type === "transcript").length;
  const missingTranscript = items.filter((item) => item.type === "script" && !item.transcript).length;
  els.contentKpiStrip.innerHTML = [
    statusCard("保存資料", `${items.length}件`, ""),
    statusCard("今月の資料", `${thisMonthItems.length}件`, "warning"),
    statusCard("話した内容", `${transcripts}件`, "final"),
    statusCard("放送後未記入", `${missingTranscript}件`, missingTranscript ? "warning" : ""),
  ].join("");
}

function renderContentIssues() {
  const issues = analyzeContentItems();
  if (!issues.length) {
    els.contentIssueList.innerHTML = `<div class="issue-item good"><strong>大きな警告はありません</strong><span>タイトル重複、本文の近さ、未入力項目を確認しました。</span></div>`;
    return;
  }

  els.contentIssueList.innerHTML = issues
    .slice(0, 10)
    .map((issue) => `
      <article class="issue-item ${escapeHtml(issue.level)}">
        <strong>${escapeHtml(issue.title)}</strong>
        <span>${escapeHtml(issue.detail)}</span>
      </article>
    `)
    .join("");
}

function renderContentArchive() {
  const query = normalizeSearchText(contentSearchText);
  const items = (state.contentItems || [])
    .filter((item) => {
      if (!query) return true;
      return normalizeSearchText([item.title, item.program, item.body, item.transcript, item.source, ...(item.tags || [])].join(" ")).includes(query);
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!items.length) {
    els.contentList.innerHTML = `<div class="content-item"><strong>放送資料はまだありません</strong><span>右側のフォームから台本や文字起こしを保存できます。</span></div>`;
    return;
  }

  els.contentList.innerHTML = items
    .slice(0, 80)
    .map((item) => `
      <article class="content-item">
        <div class="content-meta">
          <span>${escapeHtml(contentTypeLabels[item.type] || "資料")}</span>
          <span>${escapeHtml(formatDateShort(item.date))}</span>
          <span>${escapeHtml(item.program || "番組未設定")}</span>
        </div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml((item.tags || []).join("、") || "タグなし")}</span>
        <p>${escapeHtml(getContentExcerpt(item))}</p>
      </article>
    `)
    .join("");
}

function renderDocumentDashboard() {
  if (!els.documentList) return;
  renderDocumentKpis();
  renderDocumentList();
}

function renderDocumentKpis() {
  const items = state.businessDocuments || [];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const unpaidCount = items.filter((item) => item.type === "invoice" && !["paid", "cancelled"].includes(item.status)).length;
  const monthAmount = items
    .filter((item) => item.issueDate?.startsWith(state.currentMonth) && item.type !== "delivery" && item.status !== "cancelled")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  els.documentKpiStrip.innerHTML = [
    statusCard("登録書類", `${items.length}件`, ""),
    statusCard("送付待ち", `${readyCount}件`, readyCount ? "warning" : ""),
    statusCard("未入金請求", `${unpaidCount}件`, unpaidCount ? "warning" : "final"),
    statusCard("今月金額", formatMoney(monthAmount), "final"),
  ].join("");
}

function renderDocumentList() {
  const query = normalizeSearchText(documentSearchText);
  const items = (state.businessDocuments || [])
    .filter((item) => {
      if (!query) return true;
      return normalizeSearchText([item.client, item.contact, item.title, item.fileRef, item.memo, documentTypeLabels[item.type], documentStatusLabels[item.status]].join(" ")).includes(query);
    })
    .sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)) || new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!items.length) {
    els.documentList.innerHTML = `<div class="document-item"><strong>登録書類はまだありません</strong><span>右側のフォームから請求書・納品書・見積書の送付情報を保存できます。</span></div>`;
    return;
  }

  els.documentList.innerHTML = items
    .slice(0, 100)
    .map((item) => `
      <article class="document-item ${escapeHtml(item.status)}">
        <div>
          <div class="content-meta">
            <span>${escapeHtml(documentTypeLabels[item.type] || "書類")}</span>
            <span>${escapeHtml(formatDateShort(item.issueDate))}</span>
            <span class="status-badge ${escapeHtml(documentStatusClass(item.status))}">${escapeHtml(documentStatusLabels[item.status] || "下書き")}</span>
          </div>
          <strong>${escapeHtml(item.client)} / ${escapeHtml(item.title)}</strong>
          <span>${escapeHtml([item.contact, item.dueDate ? `期限 ${formatDateShort(item.dueDate)}` : "", formatMoney(item.amount), item.fileRef].filter(Boolean).join(" / "))}</span>
          ${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ""}
        </div>
        <div class="document-actions">
          <button class="small-button" type="button" data-doc-copy="${escapeHtml(item.id)}">送付文コピー</button>
          ${item.status !== "sent" && item.status !== "paid" ? `<button class="small-button approve" type="button" data-doc-status="${escapeHtml(item.id)}" data-next-status="sent">送付済み</button>` : ""}
          ${item.type === "invoice" && item.status !== "paid" ? `<button class="small-button approve" type="button" data-doc-status="${escapeHtml(item.id)}" data-next-status="paid">入金済み</button>` : ""}
        </div>
      </article>
    `)
    .join("");
}

function syncForms() {
  const defaultDate = state.selectedDate || getDefaultSelectedDate(state.currentMonth);
  if (!els.postDate.value || !els.postDate.value.startsWith(state.currentMonth)) {
    els.postDate.value = defaultDate;
  }
  if (!els.shiftDate.value || !els.shiftDate.value.startsWith(state.currentMonth)) {
    els.shiftDate.value = defaultDate;
  }
  if (!els.availabilityDate.value || !els.availabilityDate.value.startsWith(state.currentMonth)) {
    els.availabilityDate.value = defaultDate;
  }
  if (!selectedMusicDate.startsWith(state.currentMonth)) {
    selectedMusicDate = defaultDate;
  }
  if (!els.musicGenerateDate.value || !els.musicGenerateDate.value.startsWith(state.currentMonth)) {
    els.musicGenerateDate.value = selectedMusicDate;
  }
  if (!els.contentDate.value) {
    els.contentDate.value = defaultDate;
  }
  if (!els.documentIssueDate.value || !els.documentIssueDate.value.startsWith(state.currentMonth)) {
    els.documentIssueDate.value = defaultDate;
  }

  if (!isAdmin() && currentUser?.staffId) {
    els.fromStaff.value = currentUser.staffId;
    els.availabilityStaff.value = currentUser.staffId;
  } else if (!els.availabilityStaff.value) {
    els.availabilityStaff.value = staffMembers[0]?.id || "";
  }

  updateShiftFormFromSelection();
}

function applyPermissions() {
  const admin = isAdmin();
  const viewer = currentUser?.permission === "viewer";
  if (!admin && activeModule === "documents") {
    activeModule = "shift";
  }
  document.body.classList.toggle("is-staff", !admin);
  document.body.classList.toggle("is-viewer", viewer);
  document.body.classList.toggle("is-admin", admin);
  if (!admin && ["csv", "masters"].includes(activeShiftTab)) {
    activeShiftTab = "overview";
  }
  applyShiftTabVisibility();
  els.fromStaff.disabled = !admin;

  [els.shareDraftButton, els.finalizeButton, els.autoDraftButton, els.resetButton, els.aiPromptButton, els.templateButton, els.previewCsvButton].forEach((button) => {
    button.disabled = !admin;
    button.title = admin ? "" : "管理者のみ操作できます";
  });
  els.importCsvButton.disabled = !admin || !pendingCsvImport;
  els.importCsvButton.title = admin ? (pendingCsvImport ? "" : "先にCSV内容を確認してください") : "管理者のみ操作できます";

  [els.importView, els.importMode, els.csvImportFile, els.csvPasteText].forEach((control) => {
    control.disabled = !admin;
  });

  els.shiftForm.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = !admin;
  });
  [els.musicGenerateForm, els.musicTrackForm].forEach((form) => {
    form.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = !admin;
    });
  });
  [els.copyMusicAiPromptButton, els.exportMusicTemplateButton, els.previewMusicCsvButton].forEach((button) => {
    button.disabled = !admin;
    button.title = admin ? "" : "管理者のみ操作できます";
  });
  els.importMusicCsvButton.disabled = !admin || !pendingMusicCsvImport;
  els.importMusicCsvButton.title = admin ? (pendingMusicCsvImport ? "" : "先にCSV内容を確認してください") : "管理者のみ操作できます";
  els.musicCsvPasteText.disabled = !admin;

  if (viewer) {
    [els.boardForm, els.availabilityForm, els.contentForm].forEach((form) => {
      form.querySelectorAll("input, select, textarea, button").forEach((control) => {
        control.disabled = true;
      });
    });
  }
}

function updateShiftFormFromSelection() {
  const month = state.currentMonth;
  const date = els.shiftDate.value || state.selectedDate || getDefaultSelectedDate(month);
  const slot = els.shiftSlot.value || shiftSlots[0]?.id;
  const schedule = getVisibleSchedule(state.activeView, month);
  const staffIds = schedule[date]?.[slot] || [];
  els.primaryStaff.value = staffIds[0] || staffMembers[0]?.id || "";
  els.supportStaff.value = staffIds[1] || "";
}

function handleCalendarClick(event) {
  const chip = event.target.closest("[data-staff-id]");
  if (chip) {
    if (chip.dataset.staffId === currentUser?.staffId) startQuickShiftRequest(chip);
    return;
  }
  const dayCard = event.target.closest(".day-card");
  if (!dayCard) return;
  setSelectedDate(dayCard.dataset.date, true);
}

function handleMusicCalendarClick(event) {
  const dayCard = event.target.closest("[data-music-date]");
  if (!dayCard) return;
  selectedMusicDate = dayCard.dataset.musicDate;
  els.musicGenerateDate.value = selectedMusicDate;
  renderMusicCalendar();
  renderMusicPlaylist();
  toast(`${formatDateShort(selectedMusicDate)}の選曲を表示しました`);
}

function handleBoardFilterClick(event) {
  const button = event.currentTarget;
  boardFilter = button.dataset.boardFilter || "all";
  renderBoard();
}

function startQuickShiftRequest(chip) {
  const date = chip.dataset.date;
  const slotId = chip.dataset.slotId;
  const slot = getSlot(slotId);
  if (!date || !slot || !currentUser?.staffId) return;

  setSelectedDate(date, true);
  setActiveShiftTab("requests");
  els.postType.value = "absence";
  els.postDate.value = date;
  els.postSlot.value = slotId;
  els.fromStaff.value = currentUser.staffId;
  els.toStaff.value = "";
  els.postMessage.value = `${formatDateShort(date)} ${slot.label}に入れなくなりました。交代可能な方がいればお願いします。`;
  els.boardForm.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => els.postMessage.focus(), 350);
  toast("掲示板の交代依頼フォームを準備しました。内容を確認して投稿してください");
}

function handleStaffDoubleClick(event) {
  const chip = event.target.closest("[data-staff-id]");
  if (!chip) return;

  focusedStaffId = chip.dataset.staffId;
  renderMyShifts();
  renderCalendar();
  expandCollapsible("myShiftBody");
  els.personalShiftPanel?.classList.add("is-attention");
  els.personalShiftPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
  els.personalShiftPanel?.focus({ preventScroll: true });
  window.setTimeout(() => els.personalShiftPanel?.classList.remove("is-attention"), 2200);
  const staff = getStaff(focusedStaffId);
  if (staff) toast(`右側の個人別欄に${staff.name}さんのシフトを表示しました`);
}

function handleCollapseToggle(event) {
  const button = event.target.closest("[data-collapse-target]");
  if (!button) return;
  toggleCollapsible(button.dataset.collapseTarget);
}

function toggleCollapsible(targetId) {
  const body = document.getElementById(targetId);
  if (!body) return;
  setCollapsibleOpen(targetId, body.hidden);
}

function expandCollapsible(targetId) {
  setCollapsibleOpen(targetId, true);
}

function setCollapsibleOpen(targetId, isOpen) {
  const body = document.getElementById(targetId);
  if (!body) return;
  const panel = body.closest("[data-collapsible]");
  const button = document.querySelector(`[data-collapse-target="${CSS.escape(targetId)}"]`);

  body.hidden = !isOpen;
  panel?.classList.toggle("is-collapsed", !isOpen);
  panel?.classList.toggle("is-open", isOpen);
  if (button) {
    button.setAttribute("aria-expanded", String(isOpen));
    button.textContent = isOpen ? "閉じる" : "開く";
  }
}

function buildTodayTomorrowText() {
  const lines = ["FM大師 シフト共有", ""];
  [new Date(), addDays(new Date(), 1)].forEach((date, index) => {
    const iso = formatISO(date);
    const month = monthKey(date);
    ensureLocalMonth(month);
    const workflow = state.workflow[month] || {};
    const scheduleKey = workflow.finalizedAt ? "final" : "draft";
    const schedule = state.schedules[scheduleKey]?.[month] || state.schedules.draft[month] || {};
    lines.push(`${index === 0 ? "今日" : "明日"} ${formatDateShort(iso)}（${workflow.finalizedAt ? "確定" : "仮"}）`);
    shiftSlots.forEach((slot) => {
      lines.push(`${slot.label}: ${formatStaffNames(schedule[iso]?.[slot.id] || [])}`);
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}

function buildPersonalShiftText(staffId) {
  const staff = getStaff(staffId);
  const schedule = getVisibleSchedule(state.activeView, state.currentMonth);
  const lines = [`FM大師 ${state.currentMonth} ${staff?.name || "スタッフ"}さんのシフト`, ""];
  Object.keys(schedule)
    .filter((date) => date.startsWith(state.currentMonth))
    .sort()
    .forEach((date) => {
      shiftSlots.forEach((slot) => {
        const staffIds = schedule[date]?.[slot.id] || [];
        if (!staffIds.includes(staffId)) return;
        const partners = staffIds.filter((id) => id !== staffId);
        lines.push(`${formatDateShort(date)} ${slot.label} ${slot.time}${partners.length ? ` / 一緒: ${formatStaffNames(partners)}` : ""}`);
      });
    });
  if (lines.length === 2) lines.push("今月の担当はありません。");
  return lines.join("\n");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage);
  } catch {
    window.prompt("この内容をコピーしてください", text);
  }
}

function setSelectedDate(date, rerender) {
  if (!date) return;
  state.selectedDate = date;
  els.shiftDate.value = date;
  els.postDate.value = date;
  updateShiftFormFromSelection();
  if (rerender) renderCalendar();
}

function keepSelectedDayVisible() {
  const shell = els.calendarShell;
  const selectedCard = els.calendarGrid.querySelector(`[data-date="${state.selectedDate}"]`);
  if (!shell || !selectedCard || shell.scrollWidth <= shell.clientWidth) return;

  const targetLeft = Math.max(selectedCard.offsetLeft - 18, 0);
  shell.scrollLeft = targetLeft;
}

async function handleBoardSubmit(event) {
  event.preventDefault();

  const post = {
    type: els.postType.value,
    date: els.postDate.value,
    slot: els.postSlot.value,
    fromStaff: els.fromStaff.value,
    toStaff: els.toStaff.value,
    message: els.postMessage.value.trim(),
  };

  try {
    const result = await api("/api/board", { method: "POST", body: post });
    mergeServerState(result.state);
    els.postMessage.value = "";
    render();
    if (result.post?.status === "pendingConsent") {
      toast("交換相手の承諾待ちに追加しました");
    } else if (result.post?.status === "pendingApproval") {
      toast("交換成立申請を承認待ちに追加しました");
    } else {
      toast("掲示板へ投稿しました");
    }
  } catch (error) {
    toast(error.message || "投稿できませんでした");
  }
}

async function handleShiftSubmit(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const staffIds = uniqueStaff([els.primaryStaff.value, els.supportStaff.value]);
  try {
    const result = await api("/api/shift", {
      method: "POST",
      body: {
        date: els.shiftDate.value,
        slot: els.shiftSlot.value,
        staffIds,
        view: state.activeView,
      },
    });
    mergeServerState(result.state);
    state.currentMonth = monthKey(parseISO(els.shiftDate.value));
    state.selectedDate = els.shiftDate.value;
    render();
    toast(`${state.activeView === "draft" ? "仮" : "確定"}シフトを更新しました`);
  } catch (error) {
    toast(error.message || "シフトを更新できませんでした");
  }
}

async function handleBoardAction(event) {
  const consentButton = event.target.closest("[data-consent]");
  const declineButton = event.target.closest("[data-decline]");
  if (consentButton || declineButton) {
    const target = consentButton || declineButton;
    try {
      const result = await api("/api/swap-consent", {
        method: "POST",
        body: {
          id: target.dataset.consent || target.dataset.decline,
          decision: consentButton ? "consent" : "decline",
        },
      });
      mergeServerState(result.state);
      render();
      toast(consentButton ? "交換相手の承諾を登録しました" : "交換申請を辞退扱いにしました");
    } catch (error) {
      toast(error.message || "承諾操作に失敗しました");
    }
    return;
  }

  const approveButton = event.target.closest("[data-approve]");
  const rejectButton = event.target.closest("[data-reject]");
  const target = approveButton || rejectButton;
  if (!target) return;

  try {
    const result = await api("/api/approval", {
      method: "POST",
      body: {
        id: target.dataset.approve || target.dataset.reject,
        decision: approveButton ? "approve" : "reject",
      },
    });
    mergeServerState(result.state);
    render();
    toast(approveButton ? "交換を承認し、シフトへ反映しました" : "交換申請を却下しました");
  } catch (error) {
    toast(error.message || "承認操作に失敗しました");
  }
}

async function handleAvailabilitySubmit(event) {
  event.preventDefault();
  const body = {
    staffId: isAdmin() ? els.availabilityStaff.value : currentUser?.staffId,
    date: els.availabilityDate.value,
    slot: els.availabilitySlot.value,
    type: els.availabilityType.value,
    note: els.availabilityNote.value.trim(),
  };

  try {
    const result = await api("/api/availability", { method: "POST", body });
    mergeServerState(result.state);
    els.availabilityNote.value = "";
    render();
    toast("希望を登録しました");
  } catch (error) {
    toast(error.message || "希望を登録できませんでした");
  }
}

async function saveSlotMaster() {
  if (!isAdmin()) return;
  const slots = [...els.slotMasterForm.querySelectorAll(".slot-master-row")]
    .map((row) => {
      const read = (field) => row.querySelector(`[data-field="${field}"]`)?.value.trim() || "";
      return {
        id: read("id"),
        label: read("label"),
        short: read("short"),
        time: read("time"),
        className: read("id") || `slot_${Number(row.dataset.slotIndex || 0) + 1}`,
      };
    })
    .filter((slot) => slot.id || slot.label || slot.short || slot.time);

  try {
    const result = await api("/api/slots", { method: "POST", body: { slots } });
    mergeServerState(result.state);
    render();
    toast("番組枠を保存しました");
  } catch (error) {
    toast(error.message || "番組枠を保存できませんでした");
  }
}

async function saveStaffProfile(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  try {
    const result = await api("/api/staff-profile", {
      method: "POST",
      body: {
        staffId: els.profileStaff.value,
        contact: els.profileContact.value,
        skills: els.profileSkills.value,
        unavailableNote: els.profileUnavailable.value,
      },
    });
    mergeServerState(result.state);
    syncProfileForm();
    render();
    toast("スタッフ情報を保存しました");
  } catch (error) {
    toast(error.message || "スタッフ情報を保存できませんでした");
  }
}

async function saveWorkflowSettings(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  try {
    const result = await api("/api/workflow-settings", {
      method: "POST",
      body: {
        month: state.currentMonth,
        draftDeadline: els.draftDeadline.value,
        finalDeadline: els.finalDeadline.value,
        monthlyNote: els.monthlyNote.value,
      },
    });
    mergeServerState(result.state);
    render();
    toast("月次締切メモを保存しました");
  } catch (error) {
    toast(error.message || "月次締切メモを保存できませんでした");
  }
}

async function generateMusicSelection(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  try {
    const result = await api("/api/music-generate-schedule", {
      method: "POST",
      body: {
        date: els.musicGenerateDate.value,
        theme: els.musicTheme.value.trim(),
        count: Number(els.musicCount.value || 30),
      },
    });
    mergeServerState(result.state);
    selectedMusicDate = result.selection?.date || els.musicGenerateDate.value;
    render();
    toast(`${formatDateShort(selectedMusicDate)}の選曲を作成しました`);
  } catch (error) {
    toast(error.message || "選曲を作成できませんでした");
  }
}

async function saveMusicTrack(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  try {
    const result = await api("/api/music-track", {
      method: "POST",
      body: {
        cdCode: els.trackCdCode.value,
        title: els.trackTitle.value,
        artist: els.trackArtist.value,
        genre: els.trackGenre.value,
        season: els.trackSeason.value,
        mood: els.trackMood.value,
        themes: els.trackMood.value,
      },
    });
    mergeServerState(result.state);
    els.musicTrackForm.reset();
    render();
    toast(`${result.track?.title || "楽曲"}をCD台帳に保存しました`);
  } catch (error) {
    toast(error.message || "楽曲を保存できませんでした");
  }
}

function previewMusicCsv() {
  if (!isAdmin()) return;
  const text = els.musicCsvPasteText.value.trim();
  if (!text) {
    toast("CD台帳CSVを貼り付けてください");
    return;
  }

  try {
    const rows = parseMusicCsv(text);
    const validRows = [];
    const invalidRows = [];
    rows.forEach((row, index) => {
      if (!row.title) {
        invalidRows.push({ line: index + 2, reason: "曲名がありません。" });
        return;
      }
      validRows.push(row);
    });
    pendingMusicCsvImport = validRows.length ? { rows: validRows } : null;
    renderMusicCsvPreview(validRows, invalidRows);
    applyPermissions();
    toast(validRows.length ? "CD台帳CSVのプレビューを作成しました" : "取り込める楽曲がありません");
  } catch (error) {
    resetMusicCsvPreview();
    toast(error.message || "CD台帳CSVを確認できませんでした");
  }
}

async function importMusicCsv() {
  if (!isAdmin()) return;
  if (!pendingMusicCsvImport) {
    previewMusicCsv();
    return;
  }

  try {
    const result = await api("/api/import-music", {
      method: "POST",
      body: { rows: pendingMusicCsvImport.rows },
    });
    mergeServerState(result.state);
    els.musicCsvPasteText.value = "";
    resetMusicCsvPreview();
    render();
    toast(`CD台帳へ${result.imported}件追加、${result.updated}件更新しました`);
  } catch (error) {
    toast(error.message || "CD台帳CSVを取り込めませんでした");
  }
}

function resetMusicCsvPreview() {
  pendingMusicCsvImport = null;
  if (els.musicCsvPreviewList) {
    els.musicCsvPreviewList.innerHTML = `<div class="csv-preview-item muted"><strong>プレビュー待ち</strong><span>写真/OCRやAIで作ったCD台帳CSVを貼り付けて確認します。</span></div>`;
  }
  if (els.importMusicCsvButton) {
    els.importMusicCsvButton.disabled = true;
  }
}

function renderMusicCsvPreview(validRows, invalidRows) {
  const validHtml = validRows
    .slice(0, 8)
    .map((row) => `
      <article class="csv-preview-item good">
        <strong>${escapeHtml(row.title)} / ${escapeHtml(row.artist || "アーティスト未設定")}</strong>
        <span>${escapeHtml([row.cdCode, row.trackNo ? `Track ${row.trackNo}` : "", row.genre, row.season].filter(Boolean).join(" / "))}</span>
      </article>
    `)
    .join("");
  const invalidHtml = invalidRows
    .slice(0, 5)
    .map((row) => `
      <article class="csv-preview-item danger">
        <strong>${row.line}行目は確認が必要です</strong>
        <span>${escapeHtml(row.reason)}</span>
      </article>
    `)
    .join("");

  els.musicCsvPreviewList.innerHTML = `
    <article class="csv-preview-item ${invalidRows.length ? "warning" : "good"}">
      <strong>反映候補 ${validRows.length}件 / 確認 ${invalidRows.length}件</strong>
      <span>問題がなければ「CD台帳に反映」を押してください。</span>
    </article>
    ${invalidHtml}
    ${validHtml}
  `;
}

async function saveContentItem(event) {
  event.preventDefault();

  try {
    const result = await api("/api/content-item", {
      method: "POST",
      body: {
        date: els.contentDate.value,
        program: els.contentProgram.value,
        type: els.contentType.value,
        title: els.contentTitle.value,
        tags: els.contentTags.value,
        source: els.contentSource.value,
        body: els.contentBody.value,
        transcript: els.contentTranscript.value,
      },
    });
    mergeServerState(result.state);
    els.contentForm.reset();
    els.contentDate.value = state.selectedDate || getDefaultSelectedDate(state.currentMonth);
    render();
    toast(`${result.item?.title || "放送資料"}を保存しました`);
  } catch (error) {
    toast(error.message || "放送資料を保存できませんでした");
  }
}

async function saveBusinessDocument(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  try {
    const result = await api("/api/business-document", {
      method: "POST",
      body: {
        type: els.documentType.value,
        issueDate: els.documentIssueDate.value,
        dueDate: els.documentDueDate.value,
        client: els.documentClient.value,
        contact: els.documentContact.value,
        title: els.documentTitle.value,
        amount: els.documentAmount.value,
        status: els.documentStatus.value,
        fileRef: els.documentFileRef.value,
        memo: els.documentMemo.value,
      },
    });
    mergeServerState(result.state);
    els.documentForm.reset();
    els.documentIssueDate.value = state.selectedDate || getDefaultSelectedDate(state.currentMonth);
    render();
    toast(`${documentTypeLabels[result.document?.type] || "書類"}を保存しました`);
  } catch (error) {
    toast(error.message || "書類情報を保存できませんでした");
  }
}

async function handleDocumentListClick(event) {
  const copyButton = event.target.closest("[data-doc-copy]");
  if (copyButton) {
    const documentItem = getBusinessDocument(copyButton.dataset.docCopy);
    if (!documentItem) return;
    await copyText(buildDocumentSendText(documentItem), "送付文をコピーしました");
    return;
  }

  const statusButton = event.target.closest("[data-doc-status]");
  if (!statusButton) return;
  try {
    const result = await api("/api/business-document-status", {
      method: "POST",
      body: {
        id: statusButton.dataset.docStatus,
        status: statusButton.dataset.nextStatus,
      },
    });
    mergeServerState(result.state);
    render();
    toast(`${documentStatusLabels[result.document?.status] || "ステータス"}に更新しました`);
  } catch (error) {
    toast(error.message || "ステータスを更新できませんでした");
  }
}

async function shareDraft() {
  if (!isAdmin()) return;
  try {
    const result = await api("/api/share-draft", { method: "POST", body: { month: state.currentMonth } });
    mergeServerState(result.state);
    render();
    toast("仮シフトを共有済みにしました");
  } catch (error) {
    toast(error.message || "共有できませんでした");
  }
}

async function finalizeShift() {
  if (!isAdmin()) return;
  try {
    const result = await api("/api/finalize", { method: "POST", body: { month: state.currentMonth } });
    mergeServerState(result.state);
    state.activeView = "final";
    render();
    toast("確定シフトを作成しました");
  } catch (error) {
    toast(error.message || "確定できませんでした");
  }
}

async function createAutoDraft() {
  if (!isAdmin()) return;
  if (!window.confirm("今月の仮シフトを自動作成し直します。続けますか？")) return;

  try {
    const result = await api("/api/auto-draft", { method: "POST", body: { month: state.currentMonth } });
    mergeServerState(result.state);
    state.activeView = "draft";
    render();
    toast("仮シフトを自動作成しました");
  } catch (error) {
    toast(error.message || "仮シフトを作成できませんでした");
  }
}

async function resetDemo() {
  if (!isAdmin()) return;
  if (!window.confirm("共有データを初期デモに戻します。続けますか？")) return;

  try {
    const result = await api("/api/reset-demo", { method: "POST", body: {} });
    mergeServerState(result.state);
    render();
    toast("デモデータに戻しました");
  } catch (error) {
    toast(error.message || "リセットできませんでした");
  }
}

function exportCsv() {
  const schedule = getVisibleSchedule(state.activeView, state.currentMonth);
  const rows = [["日付", "曜日", "担当枠", "時間", "スタッフ", "オリジナル番組", "表示中"]];

  Object.keys(schedule)
    .sort()
    .forEach((date) => {
      shiftSlots.forEach((slot) => {
        const names = (schedule[date][slot.id] || [])
          .map((id) => getStaff(id)?.name)
          .filter(Boolean)
          .join(" / ");
        rows.push([
          date,
          weekdayLabels[parseISO(date).getDay()],
          slot.label,
          slot.time,
          names,
          getOriginalProgramForDateSlot(date, slot)?.title || "",
          state.activeView === "draft" ? "仮シフト" : "確定シフト",
        ]);
      });
    });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fm-daishi-${state.currentMonth}-${state.activeView}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast("CSVを書き出しました");
}

function exportBackupJson() {
  if (!isAdmin()) return;
  const backup = {
    exportedAt: new Date().toISOString(),
    app: "FM大師 シフト管理",
    state,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fm-daishi-backup-${state.currentMonth}-${formatCompactDateTime(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("バックアップJSONを書き出しました");
}

async function copyTodayTomorrowText() {
  const text = buildTodayTomorrowText();
  await copyText(text, "今日・明日の共有文をコピーしました");
}

async function copyVisiblePersonalShiftText() {
  const staffId = focusedStaffId || currentUser?.staffId;
  const staff = getStaff(staffId);
  if (!staff) {
    toast("コピーできる個人シフトがありません");
    return;
  }
  const text = buildPersonalShiftText(staffId);
  await copyText(text, `${staff.name}さんのシフト一覧をコピーしました`);
}

function exportAiTemplate() {
  if (!isAdmin()) return;
  const schedule = getVisibleSchedule("draft", state.currentMonth);
  const rows = [["日付", "担当枠", "主担当", "補助担当"]];

  Object.keys(schedule)
    .sort()
    .forEach((date) => {
      shiftSlots.forEach((slot) => {
        const staffIds = schedule[date]?.[slot.id] || [];
        rows.push([
          date,
          slot.label,
          getStaff(staffIds[0])?.name || "",
          getStaff(staffIds[1])?.name || "",
        ]);
      });
    });

  downloadCsv(rows, `fm-daishi-ai-template-${state.currentMonth}.csv`);
  toast("AI用CSVテンプレートを書き出しました");
}

async function copyAiPrompt() {
  if (!isAdmin()) return;
  const staffNames = staffMembers.map((staff) => staff.name).join("、");
  const slotNames = shiftSlots.map((slot) => `${slot.label}（${slot.time}）`).join("、");
  const availabilityLines =
    (state.availability || [])
      .filter((item) => item.date?.startsWith(state.currentMonth))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => {
        const staff = getStaff(item.staffId)?.name || item.staffId;
        const slot = item.slot === "all" ? "終日" : getSlot(item.slot)?.label || item.slot;
        return `- ${item.date} ${staff} ${slot}: ${availabilityLabels[item.type] || item.type}${item.note ? `（${item.note}）` : ""}`;
      })
      .join("\n") || "- なし";
  const profileLines = staffMembers
    .map((staff) => {
      const profile = state.staffProfiles?.[staff.id] || {};
      const notes = [profile.skills, profile.unavailableNote].filter(Boolean).join(" / ") || "指定なし";
      return `- ${staff.code || staff.id} ${staff.name}: ${notes}`;
    })
    .join("\n");
  const masterAvailabilityLines =
    scheduleMasters.weeklyAvailability
      .map((item) => `- ${item.weekdayLabel} ${item.staffCode}: ${(item.hours || []).map((hour) => `${hour}時`).join(",")}`)
      .join("\n") || "- なし";
  const originalProgramLines =
    scheduleMasters.originalPrograms
      .map((program) => {
        const assignments = Object.entries(program.assignments || {})
          .map(([ability, code]) => `${ability}:${code}`)
          .join(" ");
        return `- ${program.weekdayLabel} ${program.weekRule} ${program.hour}時 ${assignments} ${program.title}`;
      })
      .join("\n") || "- なし";
  const prompt = [
    `FM大師の${state.currentMonth}のシフトCSVを作成してください。`,
    "出力はCSVのみ。説明文やMarkdownは不要です。",
    "列は必ず「日付,担当枠,主担当,補助担当」にしてください。",
    "日付は YYYY-MM-DD、担当枠は下記の名称だけを使ってください。",
    `担当枠: ${slotNames}`,
    `スタッフ: ${staffNames}`,
    "同じ日・同じ担当枠に主担当と補助担当を1名ずつ入れてください。補助担当が不要な場合は空欄で構いません。",
    "希望休、出勤可能日、スキル、NG事項をできるだけ尊重してください。",
    "曜日別の稼働可能時間:",
    masterAvailabilityLines,
    "オリジナル番組は、指定曜日・週・時間・担当を優先してください:",
    originalProgramLines,
    "希望休・出勤可能・勤務メモ:",
    availabilityLines,
    "スタッフ情報:",
    profileLines,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(prompt);
    toast("AI用プロンプトをコピーしました");
  } catch {
    window.prompt("この内容をAIへ貼り付けてください", prompt);
  }
}

async function copyMusicAiPrompt() {
  if (!isAdmin()) return;
  const sampleTracks = (state.musicLibrary || [])
    .slice(0, 30)
    .map((track) => `- ${track.cdCode || "CD未設定"} ${track.trackNo || ""}: ${track.title} / ${track.artist} / ${track.genre || "ジャンル未設定"} / ${track.season || "季節未設定"} / ${(track.themes || []).join("、")}`)
    .join("\n");
  const prompt = [
    "FM大師のCD写真・動画・既存台帳を整理して、CD台帳CSVを作成してください。",
    "出力はCSVのみ。説明文やMarkdownは不要です。",
    "列は必ず「CD番号,棚番号,曲番号,曲名,アーティスト,ジャンル,季節,雰囲気,テーマ,メモ」にしてください。",
    "写真や動画で読み取れない項目は空欄で構いません。既存の棚順や番号が分かる場合は崩さず残してください。",
    "季節やテーマは、ジューンブライド、夏、海、秋、雨、ニュース向き、トーク向きなど、選曲に使いやすい単語にしてください。",
    "",
    "現在の台帳例:",
    sampleTracks || "- まだ台帳がありません",
  ].join("\n");
  await copyText(prompt, "CD整理用AIプロンプトをコピーしました");
}

function exportMusicTemplate() {
  if (!isAdmin()) return;
  const rows = [["CD番号", "棚番号", "曲番号", "曲名", "アーティスト", "ジャンル", "季節", "雰囲気", "テーマ", "メモ"]];
  rows.push(["A-001", "棚1", "1", "曲名サンプル", "アーティスト名", "ポップス", "夏", "明るい", "夏,海,朝", "写真から読み取り"]);
  downloadCsv(rows, `fm-daishi-music-template-${state.currentMonth}.csv`);
  toast("CD台帳CSVテンプレートを書き出しました");
}

function exportMusicScheduleCsv() {
  const selection = state.musicSchedule?.[monthKey(parseISO(selectedMusicDate))]?.[selectedMusicDate];
  const tracks = getSelectionTracks(selection);
  if (!tracks.length) {
    toast("書き出せる選曲がありません");
    return;
  }
  const rows = [["日付", "順番", "CD番号", "曲番号", "曲名", "アーティスト", "ジャンル", "季節", "テーマ"]];
  tracks.forEach((track, index) => {
    rows.push([
      selectedMusicDate,
      index + 1,
      track.cdCode || "",
      track.trackNo || "",
      track.title || "",
      track.artist || "",
      track.genre || "",
      track.season || "",
      (track.themes || []).join("、"),
    ]);
  });
  downloadCsv(rows, `fm-daishi-music-${selectedMusicDate}.csv`);
  toast("選曲CSVを書き出しました");
}

async function copyContentAiPrompt() {
  const issues = analyzeContentItems()
    .slice(0, 8)
    .map((issue) => `- ${issue.title}: ${issue.detail}`)
    .join("\n") || "- 大きな警告なし";
  const latest = (state.contentItems || [])
    .slice(0, 12)
    .map((item) => `- ${item.date} ${item.program || "番組未設定"} ${item.title}: ${getContentExcerpt(item)}`)
    .join("\n");
  const draft = [
    `放送日: ${els.contentDate.value || state.selectedDate}`,
    `番組名: ${els.contentProgram.value || ""}`,
    `種類: ${contentTypeLabels[els.contentType.value] || els.contentType.value}`,
    `タイトル: ${els.contentTitle.value || ""}`,
    `タグ: ${els.contentTags.value || ""}`,
    "台本・要約:",
    els.contentBody.value || "",
    "実際に話した内容:",
    els.contentTranscript.value || "",
  ].join("\n");
  const prompt = [
    "FM大師の放送資料をチェックしてください。",
    "確認してほしい観点は、過去放送との内容重複、言い間違いの可能性、情報が古い可能性、放送で伝わりにくい表現、差別的・断定的に聞こえる表現です。",
    "返答は「要修正」「確認推奨」「問題なし」の3分類で短く整理してください。",
    "",
    "アプリ内の自動チェック結果:",
    issues,
    "",
    "最近の放送資料:",
    latest || "- なし",
    "",
    "今回チェックする資料:",
    draft,
  ].join("\n");
  await copyText(prompt, "放送資料チェック用AIプロンプトをコピーしました");
}

async function copyContentOrganizePrompt() {
  const prompt = [
    "FM大師の写真・動画・文字起こし資料を、放送資料として整理してください。",
    "出力はCSVのみ。説明文やMarkdownは不要です。",
    "列は必ず「放送日,番組名,種類,タイトル,タグ,資料メモ,台本要約,話した内容」にしてください。",
    "種類は「動画台本」「話した内容」「放送メモ」のいずれかにしてください。",
    "重複しそうな話題がある場合は、タグに「重複確認」と入れてください。",
    "写真や動画から読み取れない日付は空欄にし、資料メモにファイル名や推測理由を残してください。",
  ].join("\n");
  await copyText(prompt, "写真/動画整理プロンプトをコピーしました");
}

function exportContentCsv() {
  const rows = [["放送日", "番組名", "種類", "タイトル", "タグ", "資料メモ", "台本要約", "話した内容", "更新者", "更新日時"]];
  (state.contentItems || []).forEach((item) => {
    rows.push([
      item.date,
      item.program || "",
      contentTypeLabels[item.type] || item.type || "",
      item.title || "",
      (item.tags || []).join("、"),
      item.source || "",
      item.body || "",
      item.transcript || "",
      item.updatedByName || item.createdByName || "",
      item.updatedAt || item.createdAt || "",
    ]);
  });
  downloadCsv(rows, `fm-daishi-content-${state.currentMonth}.csv`);
  toast("放送資料CSVを書き出しました");
}

function createDocumentCsvRows() {
  const rows = [["種別", "発行日", "期限日", "送付先", "宛名", "件名", "金額", "ステータス", "ファイル", "メモ", "送付日時", "入金日時"]];
  (state.businessDocuments || []).forEach((item) => {
    rows.push([
      documentTypeLabels[item.type] || item.type || "",
      item.issueDate || "",
      item.dueDate || "",
      item.client || "",
      item.contact || "",
      item.title || "",
      item.amount || 0,
      documentStatusLabels[item.status] || item.status || "",
      item.fileRef || "",
      item.memo || "",
      item.sentAt || "",
      item.paidAt || "",
    ]);
  });
  return rows;
}

function exportDocumentsCsv() {
  if (!isAdmin()) return;
  const rows = createDocumentCsvRows();
  downloadCsv(rows, `fm-daishi-documents-${state.currentMonth}.csv`);
  toast("書類送付CSVを書き出しました");
}

function saveDocumentsToDrive() {
  if (!isAdmin()) return;
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "FM大師 業務管理",
    target: "google-drive",
    kind: "businessDocuments",
    month: state.currentMonth,
    documents: state.businessDocuments || [],
  };
  downloadCsv(createDocumentCsvRows(), `fm-daishi-google-drive-documents-${state.currentMonth}.csv`);
  downloadJson(payload, `fm-daishi-google-drive-documents-${state.currentMonth}.json`);
  toast("Googleドライブ保存用のCSVとJSONを書き出しました");
}

async function importCsvSchedule() {
  if (!isAdmin()) return;
  if (!pendingCsvImport) {
    await previewCsvSchedule();
    return;
  }

  try {
    const result = await api("/api/import-schedule", {
      method: "POST",
      body: {
        month: state.currentMonth,
        view: pendingCsvImport.view,
        mode: pendingCsvImport.mode,
        rows: pendingCsvImport.rows,
      },
    });
    mergeServerState(result.state);
    state.activeView = pendingCsvImport.view;
    els.csvImportFile.value = "";
    els.csvPasteText.value = "";
    resetCsvPreview();
    render();
    toast(`CSVを${result.imported}件反映しました`);
  } catch (error) {
    toast(error.message || "CSVを取り込めませんでした");
  }
}

async function previewCsvSchedule() {
  if (!isAdmin()) return;
  const file = els.csvImportFile.files?.[0];
  const pastedText = els.csvPasteText.value.trim();
  if (!file && !pastedText) {
    toast("CSVファイルを選択するか、CSVを貼り付けてください");
    return;
  }

  try {
    const text = file ? await file.text() : pastedText;
    const rows = parseScheduleCsv(text);
    const preview = buildCsvImportPreview(rows);
    pendingCsvImport = preview.validRows.length
      ? {
          view: els.importView.value,
          mode: els.importMode.value,
          rows: preview.validRows.map((item) => item.raw),
          changes: preview.changes,
          warnings: preview.warnings,
        }
      : null;
    renderCsvPreview(preview);
    applyPermissions();
    toast(preview.validRows.length ? "CSVプレビューを作成しました" : "取り込める行がありません");
  } catch (error) {
    resetCsvPreview();
    toast(error.message || "CSVを確認できませんでした");
  }
}

function resetCsvPreview() {
  pendingCsvImport = null;
  if (els.csvPreviewList) {
    els.csvPreviewList.innerHTML = `<div class="csv-preview-item muted"><strong>プレビュー待ち</strong><span>CSV内容を確認すると、変更点と警告を表示します。</span></div>`;
  }
  applyPermissions();
}

function renderCsvPreview(preview) {
  const summaryTone = preview.warnings.some((item) => item.level === "danger") ? "danger" : preview.warnings.length ? "warning" : "good";
  const warningHtml = preview.warnings
    .slice(0, 5)
    .map((issue) => `
      <article class="csv-preview-item ${escapeHtml(issue.level)}">
        <strong>${escapeHtml(issue.title)}</strong>
        <span>${escapeHtml(issue.detail)}</span>
      </article>
    `)
    .join("");
  const changeHtml = preview.changes
    .slice(0, 8)
    .map((change) => `
      <article class="csv-preview-item">
        <strong>${escapeHtml(formatDateShort(change.date))} ${escapeHtml(change.slot.label)}</strong>
        <span>${escapeHtml(change.before)} → ${escapeHtml(change.after)}</span>
      </article>
    `)
    .join("");
  const invalidHtml = preview.invalidRows
    .slice(0, 4)
    .map((item) => `
      <article class="csv-preview-item danger">
        <strong>${escapeHtml(item.line)}行目は確認が必要です</strong>
        <span>${escapeHtml(item.reason)}</span>
      </article>
    `)
    .join("");

  els.csvPreviewList.innerHTML = `
    <article class="csv-preview-item ${summaryTone}">
      <strong>反映候補 ${preview.validRows.length}件 / 変更 ${preview.changes.length}件 / 警告 ${preview.warnings.length}件</strong>
      <span>問題がなければ「プレビューを反映」を押してください。</span>
    </article>
    ${invalidHtml}
    ${warningHtml}
    ${changeHtml || `<article class="csv-preview-item muted"><strong>変更はありません</strong><span>現在のシフトと同じ内容です。</span></article>`}
  `;
}

function parseScheduleCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSVにデータ行がありません");
  const headers = rows[0].map((header) => normalizeHeader(header));
  const index = {
    date: findHeader(headers, ["date", "日付", "年月日"]),
    slot: findHeader(headers, ["slot", "担当枠", "枠"]),
    primary: findHeader(headers, ["primary", "主担当", "担当者", "スタッフ1"]),
    support: findHeader(headers, ["support", "補助担当", "副担当", "スタッフ2"]),
  };

  if (index.date < 0 || index.slot < 0 || index.primary < 0) {
    throw new Error("CSVには「日付,担当枠,主担当,補助担当」の列が必要です");
  }

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => ({
      date: row[index.date] || "",
      slot: row[index.slot] || "",
      primary: row[index.primary] || "",
      support: index.support >= 0 ? row[index.support] || "" : "",
    }));
}

function parseMusicCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSVにデータ行がありません");
  const headers = rows[0].map((header) => normalizeHeader(header));
  const index = {
    cdCode: findHeader(headers, ["cdcode", "cd", "CD番号", "CDNo", "管理番号"]),
    shelf: findHeader(headers, ["shelf", "棚番号", "棚", "保管場所"]),
    trackNo: findHeader(headers, ["trackno", "track", "曲番号", "曲順", "トラック"]),
    title: findHeader(headers, ["title", "曲名", "楽曲名"]),
    artist: findHeader(headers, ["artist", "アーティスト", "歌手"]),
    genre: findHeader(headers, ["genre", "ジャンル"]),
    season: findHeader(headers, ["season", "季節"]),
    mood: findHeader(headers, ["mood", "雰囲気", "曲調"]),
    themes: findHeader(headers, ["theme", "themes", "テーマ", "タグ"]),
    notes: findHeader(headers, ["notes", "memo", "メモ", "備考"]),
  };

  if (index.title < 0) {
    throw new Error("CD台帳CSVには「曲名」列が必要です");
  }

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => ({
      cdCode: index.cdCode >= 0 ? row[index.cdCode] || "" : "",
      shelf: index.shelf >= 0 ? row[index.shelf] || "" : "",
      trackNo: index.trackNo >= 0 ? row[index.trackNo] || "" : "",
      title: row[index.title] || "",
      artist: index.artist >= 0 ? row[index.artist] || "" : "",
      genre: index.genre >= 0 ? row[index.genre] || "" : "",
      season: index.season >= 0 ? row[index.season] || "" : "",
      mood: index.mood >= 0 ? row[index.mood] || "" : "",
      themes: index.themes >= 0 ? row[index.themes] || "" : "",
      notes: index.notes >= 0 ? row[index.notes] || "" : "",
    }));
}

function buildCsvImportPreview(rows) {
  const month = state.currentMonth;
  const view = els.importView.value;
  const mode = els.importMode.value;
  const currentSchedule = cloneSchedule(getVisibleSchedule(view, month));
  const nextSchedule = mode === "replaceMonth" ? createEmptyLocalMonthSchedule(month) : cloneSchedule(currentSchedule);
  const validRows = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const date = normalizeCsvDate(row.date);
    const slotId = normalizeCsvSlot(row.slot);
    const primary = normalizeCsvStaff(row.primary);
    const support = normalizeCsvStaff(row.support);
    const staffIds = uniqueStaff([primary, support]).slice(0, 2);

    if (!date || !date.startsWith(month)) {
      invalidRows.push({ line, reason: "対象月ではない、または日付が正しくありません。" });
      return;
    }
    if (!slotId) {
      invalidRows.push({ line, reason: `担当枠「${row.slot || ""}」が見つかりません。` });
      return;
    }
    if (!staffIds.length) {
      invalidRows.push({ line, reason: "主担当または補助担当のスタッフ名が見つかりません。" });
      return;
    }

    if (!nextSchedule[date]) nextSchedule[date] = {};
    nextSchedule[date][slotId] = staffIds;
    validRows.push({ raw: row, date, slotId, staffIds });
  });

  const changes = validRows
    .map((row) => {
      const beforeIds = currentSchedule[row.date]?.[row.slotId] || [];
      const afterIds = nextSchedule[row.date]?.[row.slotId] || [];
      return {
        date: row.date,
        slot: getSlot(row.slotId),
        before: formatStaffNames(beforeIds),
        after: formatStaffNames(afterIds),
        changed: beforeIds.join("|") !== afterIds.join("|"),
      };
    })
    .filter((item) => item.changed);

  return {
    validRows,
    invalidRows,
    changes,
    warnings: analyzeSchedule(nextSchedule, month),
  };
}

function createEmptyLocalMonthSchedule(month) {
  const { year, monthIndex } = parseMonth(month);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const schedule = {};

  for (let day = 1; day <= totalDays; day += 1) {
    const date = formatISO(new Date(year, monthIndex, day));
    schedule[date] = {};
    shiftSlots.forEach((slot) => {
      schedule[date][slot.id] = [];
    });
  }

  return schedule;
}

function normalizeCsvDate(value) {
  const text = String(value || "").trim().replaceAll("/", "-");
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) return "";
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return formatISO(date);
}

function normalizeCsvSlot(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const exact = shiftSlots.find((slot) => slot.id === text || slot.label === text || slot.short === text);
  if (exact) return exact.id;
  const hourMatch = text.match(/(\d{1,2})/);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    const hourSlot = shiftSlots.find((slot) => getSlotHour(slot) === hour);
    if (hourSlot) return hourSlot.id;
  }
  const fuzzy = shiftSlots.find((slot) => text.includes(slot.label) || text.includes(slot.short) || slot.label.includes(text));
  return fuzzy?.id || "";
}

function normalizeCsvStaff(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const normalized = text.replace(/\s+/g, "");
  const exact = staffMembers.find((staff) => {
    return staff.id === text || staff.code === text.toUpperCase() || staff.name === text || staff.name.replace(/\s+/g, "") === normalized;
  });
  if (exact) return exact.id;
  const fuzzy = staffMembers.find((staff) => {
    const staffName = staff.name.replace(/\s+/g, "");
    return normalized.includes(staffName) || staffName.includes(normalized);
  });
  return fuzzy?.id || "";
}

function formatStaffNames(staffIds) {
  return (
    staffIds
      .map((id) => getStaff(id)?.name)
      .filter(Boolean)
      .join(" / ") || "未設定"
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function findHeader(headers, candidates) {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeader(candidate));
  return headers.findIndex((header) => normalizedCandidates.includes(header));
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function moveMonth(offset) {
  const { year, monthIndex } = parseMonth(state.currentMonth);
  const next = new Date(year, monthIndex + offset, 1);
  state.currentMonth = monthKey(next);
  state.selectedDate = getDefaultSelectedDate(state.currentMonth);
  els.postDate.value = state.selectedDate;
  els.shiftDate.value = state.selectedDate;
  await refreshState("navigation").catch((error) => toast(error.message));
}

async function goToToday() {
  const todayIso = formatISO(new Date());
  state.currentMonth = monthKey(new Date());
  state.selectedDate = todayIso;
  await refreshState("navigation").catch((error) => toast(error.message));
}

function setActiveView(view) {
  state.activeView = view;
  ensureLocalMonth(state.currentMonth);
  render();
}

function setActiveModule(module) {
  activeModule = ["shift", "music", "content", "documents"].includes(module) ? module : "shift";
  applyModuleVisibility();
}

function setActiveShiftTab(tab) {
  const adminTabs = ["csv", "masters"];
  const allowedTabs = isAdmin() ? ["overview", "requests", ...adminTabs] : ["overview", "requests"];
  activeShiftTab = allowedTabs.includes(tab) ? tab : "overview";
  applyShiftTabVisibility();
}

function applyShiftTabVisibility() {
  const admin = isAdmin();
  if (!admin && ["csv", "masters"].includes(activeShiftTab)) {
    activeShiftTab = "overview";
  }

  els.shiftTabs.forEach((button) => {
    const isActive = button.dataset.shiftTab === activeShiftTab;
    if (button.classList.contains("shift-subtab")) {
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    }
  });
  els.shiftPanels.forEach((panel) => {
    const isAdminPanel = panel.classList.contains("admin-panel");
    const isVisible = panel.dataset.shiftPanel === activeShiftTab && (admin || !isAdminPanel);
    panel.hidden = !isVisible;
    panel.classList.toggle("active", isVisible);
  });
}

function applyModuleVisibility() {
  els.moduleTabs.forEach((button) => {
    const isActive = button.dataset.module === activeModule;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
  els.modulePanels.forEach((panel) => {
    const isActive = panel.dataset.modulePanel === activeModule;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
  document.body.classList.toggle("module-music", activeModule === "music");
  document.body.classList.toggle("module-content", activeModule === "content");
}

function mergeServerState(serverState) {
  const prefs = {
    currentMonth: state.currentMonth,
    activeView: state.activeView,
    selectedDate: state.selectedDate,
  };
  Object.assign(state, serverState, prefs);
  syncReferenceDataFromState();
  ensureLocalMonth(state.currentMonth);
}

function syncReferenceDataFromState() {
  if (!Array.isArray(state.shiftSlots) || !state.shiftSlots.length) return;
  const currentSignature = JSON.stringify(shiftSlots);
  const nextSignature = JSON.stringify(state.shiftSlots);
  if (currentSignature === nextSignature) return;

  shiftSlots = state.shiftSlots;
  populateControls();
}

function getVisibleSchedule(view, month) {
  ensureLocalMonth(month);
  if (view === "final") {
    if (!state.schedules.final[month]) {
      state.schedules.final[month] = cloneSchedule(state.schedules.draft[month]);
    }
    return state.schedules.final[month];
  }
  return state.schedules.draft[month];
}

function analyzeSchedule(schedule, month) {
  const issues = [];
  const perStaffDates = new Map();
  const perStaffDayCounts = new Map();

  Object.keys(schedule || {})
    .filter((date) => date.startsWith(month))
    .sort()
    .forEach((date) => {
      const daySchedule = schedule[date] || {};
      const dayStaffCounts = new Map();
      shiftSlots.forEach((slot) => {
        const staffIds = daySchedule[slot.id] || [];
        const program = getOriginalProgramForDateSlot(date, slot);
        const programStaffIds = program ? getOriginalProgramStaffIds(program) : [];
        if (program) {
          const missing = programStaffIds.filter((staffId) => !staffIds.includes(staffId));
          if (missing.length) {
            issues.push({
              level: "danger",
              title: "オリジナル番組の担当違い",
              detail: `${formatDateShort(date)} ${slot.label}「${program.title}」の指定担当 ${formatStaffNames(programStaffIds)} と現在の担当 ${formatStaffNames(staffIds)} が違います。`,
            });
          }
        }
        staffIds.forEach((staffId) => {
          dayStaffCounts.set(staffId, (dayStaffCounts.get(staffId) || 0) + 1);
          if (!perStaffDates.has(staffId)) perStaffDates.set(staffId, new Set());
          perStaffDates.get(staffId).add(date);
          const key = `${staffId}:${date}`;
          perStaffDayCounts.set(key, (perStaffDayCounts.get(key) || 0) + 1);
          const off = findAvailabilityConflict(staffId, date, slot.id);
          if (off) {
            issues.push({
              level: "danger",
              title: "希望休と衝突",
              detail: `${formatDateShort(date)} ${slot.label}: ${getStaff(staffId)?.name || staffId}さんは${availabilityLabels[off.type] || "希望"}を登録しています${off.note ? `（${off.note}）` : ""}。`,
            });
          }
          const profileNote = state.staffProfiles?.[staffId]?.unavailableNote || "";
          if (profileNote && mentionsWeekday(profileNote, parseISO(date).getDay())) {
            issues.push({
              level: "warning",
              title: "NG曜日メモと一致",
              detail: `${formatDateShort(date)} ${slot.label}: ${getStaff(staffId)?.name || staffId}さんのNGメモ「${profileNote}」に該当する可能性があります。`,
            });
          }
          if (!program) {
            const masterAvailable = getMasterAvailableStaffIds(parseISO(date).getDay(), getSlotHour(slot));
            if (masterAvailable.length && !masterAvailable.includes(staffId)) {
              issues.push({
                level: "warning",
                title: "稼働可能時間外の可能性",
                detail: `${formatDateShort(date)} ${slot.label}: ${getStaff(staffId)?.name || staffId}さんは曜日別の稼働可能時間に入っていません。`,
              });
            }
          }
        });
      });

      const multiSlotThreshold = shiftSlots.length >= 7 ? 5 : 2;
      dayStaffCounts.forEach((count, staffId) => {
        if (count >= multiSlotThreshold) {
          issues.push({
            level: "warning",
            title: "同日の担当が多め",
            detail: `${formatDateShort(date)}: ${getStaff(staffId)?.name || staffId}さんが同日に${count}枠入っています。`,
          });
        }
      });
    });

  perStaffDates.forEach((dateSet, staffId) => {
    const sorted = [...dateSet].sort();
    let streak = 1;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = parseISO(sorted[index - 1]);
      const current = parseISO(sorted[index]);
      const diffDays = Math.round((current - previous) / 86400000);
      streak = diffDays === 1 ? streak + 1 : 1;
      if (streak >= 4) {
        issues.push({
          level: "warning",
          title: "連続勤務が多め",
          detail: `${getStaff(staffId)?.name || staffId}さんが${formatDateShort(sorted[index - streak + 1])}から${formatDateShort(sorted[index])}まで${streak}日連続で入っています。`,
        });
        break;
      }
    }
  });

  return issues;
}

function analyzeMusicSchedule() {
  const issues = [];
  const monthSchedule = state.musicSchedule?.[state.currentMonth] || {};
  const trackDateMap = new Map();

  Object.entries(monthSchedule)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, selection]) => {
      const trackIds = selection.trackIds || [];
      if (!trackIds.length) {
        issues.push({ level: "warning", title: "選曲が空です", detail: `${formatDateShort(date)}の選曲リストに曲がありません。` });
      }
      if (trackIds.length < 30) {
        issues.push({ level: "warning", title: "30曲未満です", detail: `${formatDateShort(date)}は${trackIds.length}曲です。毎日30曲以上の運用なら追加確認してください。` });
      }
      const genres = new Set(trackIds.map((id) => getTrack(id)?.genre).filter(Boolean));
      if (trackIds.length >= 10 && genres.size <= 2) {
        issues.push({ level: "warning", title: "ジャンルが偏っています", detail: `${formatDateShort(date)}はジャンルが${genres.size}種類です。番組全体の流れを確認してください。` });
      }
      trackIds.forEach((trackId) => {
        if (!trackDateMap.has(trackId)) trackDateMap.set(trackId, []);
        trackDateMap.get(trackId).push(date);
      });
    });

  trackDateMap.forEach((dates, trackId) => {
    if (dates.length < 2) return;
    for (let index = 1; index < dates.length; index += 1) {
      const diff = Math.round((parseISO(dates[index]) - parseISO(dates[index - 1])) / 86400000);
      if (diff <= 7) {
        const track = getTrack(trackId);
        issues.push({
          level: "danger",
          title: "直近で同じ曲",
          detail: `${track?.title || trackId}が${formatDateShort(dates[index - 1])}と${formatDateShort(dates[index])}に入っています。`,
        });
        break;
      }
    }
  });

  if (!Object.keys(monthSchedule).length) {
    issues.push({ level: "warning", title: "今月の選曲予定がありません", detail: "選曲カレンダーで日付を選び、テーマから自動作成してください。" });
  }

  return issues;
}

function analyzeContentItems() {
  const issues = [];
  const items = state.contentItems || [];

  items.forEach((item) => {
    if (!item.body && !item.transcript) {
      issues.push({ level: "warning", title: "本文が未入力です", detail: `${formatDateShort(item.date)} ${item.title}に台本・文字起こしがありません。` });
    }
    if (item.type === "script" && !item.transcript) {
      issues.push({ level: "warning", title: "放送後の話した内容が未記入", detail: `${item.title}は台本のみです。放送後に文字起こしやメモを残すと再利用しやすくなります。` });
    }
  });

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const first = items[i];
      const second = items[j];
      const titleSame = normalizeSearchText(first.title) && normalizeSearchText(first.title) === normalizeSearchText(second.title);
      const overlap = contentOverlapScore(first, second);
      if (titleSame || overlap >= 0.52) {
        issues.push({
          level: titleSame ? "danger" : "warning",
          title: titleSame ? "タイトルが重複しています" : "内容が近い可能性",
          detail: `${formatDateShort(first.date)}「${first.title}」と${formatDateShort(second.date)}「${second.title}」を確認してください。`,
        });
      }
    }
  }

  return issues;
}

function contentOverlapScore(first, second) {
  const firstWords = keywordSet(getContentExcerpt(first));
  const secondWords = keywordSet(getContentExcerpt(second));
  if (!firstWords.size || !secondWords.size) return 0;
  const overlap = [...firstWords].filter((word) => secondWords.has(word)).length;
  return overlap / Math.min(firstWords.size, secondWords.size);
}

function keywordSet(text) {
  const source = String(text || "");
  const words = source
    .replace(/[。、，,.!！?？「」『』（）()]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
  const compact = normalizeSearchText(source).replace(/[。、，,.!！?？「」『』（）()]/g, "");
  const grams = [];
  for (let index = 0; index <= compact.length - 4; index += 2) {
    grams.push(compact.slice(index, index + 4));
  }
  return new Set([...words, ...grams]);
}

function getSelectionTracks(selection) {
  return (selection?.trackIds || []).map((id) => getTrack(id)).filter(Boolean);
}

function getTrack(id) {
  return (state.musicLibrary || []).find((track) => track.id === id);
}

function getContentExcerpt(item) {
  const text = [item.body, item.transcript].filter(Boolean).join(" ");
  return text.length > 140 ? `${text.slice(0, 140)}...` : text || item.source || "本文なし";
}

function inferLocalSeasonTheme(value) {
  const month = /^\d{4}-\d{2}$/.test(String(value)) ? Number(String(value).slice(5, 7)) : parseISO(value).getMonth() + 1;
  if (month === 6) return "ジューンブライド・雨・初夏";
  if (month === 7 || month === 8) return "夏・海・祭り";
  if (month === 9) return "秋の始まり";
  if ([3, 4, 5].includes(month)) return "春・新生活";
  if ([12, 1, 2].includes(month)) return "冬・年末年始";
  return "季節のおすすめ";
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function findAvailabilityConflict(staffId, date, slotId) {
  return (state.availability || []).find((item) => {
    return item.staffId === staffId && item.date === date && item.type === "off" && (item.slot === "all" || item.slot === slotId);
  });
}

function mentionsWeekday(note, dayIndex) {
  const label = weekdayLabels[dayIndex];
  if (!label) return false;
  return note.includes(`${label}曜`) || note.includes(`${label}曜日`) || note.includes(`${label}曜午`) || note.includes(`${label}曜不可`);
}

function getStaffMonthlyCounts(schedule, month) {
  const counts = new Map(staffMembers.map((staff) => [staff.id, { staffId: staff.id, total: 0, slots: {} }]));

  Object.keys(schedule || {})
    .filter((date) => date.startsWith(month))
    .forEach((date) => {
      shiftSlots.forEach((slot) => {
        (schedule[date]?.[slot.id] || []).forEach((staffId) => {
          if (!counts.has(staffId)) counts.set(staffId, { staffId, total: 0, slots: {} });
          const item = counts.get(staffId);
          item.total += 1;
          item.slots[slot.id] = (item.slots[slot.id] || 0) + 1;
        });
      });
    });

  return [...counts.values()].sort((a, b) => b.total - a.total || String(getStaff(a.staffId)?.name || a.staffId).localeCompare(String(getStaff(b.staffId)?.name || b.staffId), "ja"));
}

function ensureLocalMonth(month) {
  if (!state.schedules.draft[month]) {
    state.schedules.draft[month] = generateMonthSchedule(month);
  }
  if (!state.workflow[month]) {
    state.workflow[month] = {
      draftSharedAt: null,
      finalizedAt: null,
      draftDeadline: "",
      finalDeadline: "",
      monthlyNote: "",
    };
  }
  if (!state.musicSchedule) state.musicSchedule = {};
  if (!state.musicSchedule[month]) state.musicSchedule[month] = {};
}

function generateMonthSchedule(month) {
  const { year, monthIndex } = parseMonth(month);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const schedule = {};

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    const iso = formatISO(date);
    const weekendOffset = [0, 6].includes(date.getDay()) ? 1 : 0;
    schedule[iso] = {};

    shiftSlots.forEach((slot, slotIndex) => {
      const first = staffMembers[(day + slotIndex * 2 + weekendOffset) % staffMembers.length].id;
      const second = staffMembers[(day + slotIndex * 2 + 3) % staffMembers.length].id;
      schedule[iso][slot.id] = date.getDay() === 0 ? [first] : [first, second];
    });
  }

  return schedule;
}

function getPendingApprovals() {
  return state.board
    .filter((post) => {
      return post.date?.startsWith(state.currentMonth) && post.type === "swapConfirmed" && ["pendingConsent", "pendingApproval"].includes(post.status);
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function canConsentSwap(post) {
  return isAdmin() || currentUser?.staffId === post.toStaff;
}

function syncProfileForm() {
  const staffId = els.profileStaff.value || currentUser?.staffId || staffMembers[0]?.id || "";
  const profile = state.staffProfiles?.[staffId] || {};
  els.profileContact.value = profile.contact || "";
  els.profileSkills.value = profile.skills || "";
  els.profileUnavailable.value = profile.unavailableNote || "";
}

function buildPostTitle(post, from, to, slot) {
  const fromName = from?.name || "スタッフ";
  const toName = to?.name || "未定";
  const slotLabel = slot?.label || "担当枠";

  if (post.type === "absence") return `${fromName}さんが${slotLabel}に入れません`;
  if (post.type === "swapRequest") return `${fromName}さんから${slotLabel}の交換依頼`;
  if (post.type === "swapConfirmed") return `${fromName}さんから${toName}さんへ交換申請`;
  return "シフトに関する連絡";
}

function buildDefaultMessage(post) {
  const slot = getSlot(post.slot);
  const from = getStaff(post.fromStaff);
  const to = getStaff(post.toStaff);
  const date = formatDateShort(post.date);

  if (post.type === "absence") {
    return `${date} ${slot?.label || ""}に入れなくなりました。交代可能な方は返信してください。`;
  }
  if (post.type === "swapRequest") {
    return `${date} ${slot?.label || ""}の交換をお願いしたいです。`;
  }
  if (post.type === "swapConfirmed") {
    return `${date} ${slot?.label || ""}を${from?.name || "担当者"}さんから${to?.name || "交代者"}さんへ変更申請します。`;
  }
  return "シフトに関する連絡です。";
}

async function api(path, options = {}) {
  if (staticMode) return staticApi(path, options);

  const headers = { Accept: "application/json" };
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.auth !== false && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (shouldUseStaticFallback(path, options)) return enableStaticMode(path, options);
    throw error;
  }

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    if (shouldUseStaticFallback(path, options, response)) return enableStaticMode(path, options);
    throw new Error("通信結果を読み取れませんでした");
  }

  if (!response.ok) {
    if (shouldUseStaticFallback(path, options, response)) return enableStaticMode(path, options);
    if (response.status === 401 && options.auth !== false) logout(false);
    throw new Error(payload.error || "通信に失敗しました");
  }
  return payload;
}

function shouldUseStaticFallback(path, options = {}, response = null) {
  const method = options.method || "GET";
  const url = new URL(path, window.location.href);
  return method === "GET" && url.pathname === "/api/config" && (!response || response.status === 404);
}

function enableStaticMode(path, options) {
  staticMode = true;
  setSyncStatus("納品確認用の静的公開版です");
  return staticApi(path, options);
}

async function staticApi(path, options = {}) {
  const url = new URL(path, window.location.href);
  const method = options.method || "GET";

  if (method === "GET" && url.pathname === "/api/config") {
    return {
      staffMembers: staticStaffMembers,
      shiftSlots: staticShiftSlots,
      scheduleMasters: await loadStaticScheduleMasters(),
      users: staticLoginUsers.map(publicStaticUser),
    };
  }

  if (method === "POST" && url.pathname === "/api/login") {
    const body = options.body || {};
    const user = staticLoginUsers.find((item) => item.id === body.userId && item.pin === String(body.pin || ""));
    if (!user) throw new Error("ログインIDまたはPINが違います。");
    return {
      token: `static-${user.id}-${Date.now()}`,
      user: publicStaticUser(user),
    };
  }

  if (method === "GET" && url.pathname === "/api/state") {
    const store = await loadStaticStore();
    return {
      state: normalizeStaticStore(store),
      user: currentUser,
      serverTime: new Date().toISOString(),
    };
  }

  if (method === "POST" && url.pathname === "/api/auto-draft") {
    const store = normalizeStaticStore(await loadStaticStore());
    const month = normalizeMonth(options.body?.month || state.currentMonth);
    ensureStaticMonth(store, month);
    store.schedules.draft[month] = generateClientMonthSchedule(month, store);
    store.workflow[month].draftSharedAt = null;
    store.updatedAt = new Date().toISOString();
    store.version = Number(store.version || 1) + 1;
    saveStaticStore(store);
    return { state: store };
  }

  if (method === "POST" && url.pathname === "/api/share-draft") {
    const store = normalizeStaticStore(await loadStaticStore());
    const month = normalizeMonth(options.body?.month || state.currentMonth);
    ensureStaticMonth(store, month);
    store.workflow[month].draftSharedAt = new Date().toISOString();
    store.updatedAt = new Date().toISOString();
    store.version = Number(store.version || 1) + 1;
    saveStaticStore(store);
    return { state: store };
  }

  if (method === "POST" && url.pathname === "/api/finalize") {
    const store = normalizeStaticStore(await loadStaticStore());
    const month = normalizeMonth(options.body?.month || state.currentMonth);
    ensureStaticMonth(store, month);
    store.schedules.final[month] = cloneSchedule(store.schedules.draft[month]);
    store.workflow[month].finalizedAt = new Date().toISOString();
    store.updatedAt = new Date().toISOString();
    store.version = Number(store.version || 1) + 1;
    saveStaticStore(store);
    return { state: store };
  }

  throw new Error("納品確認用の静的公開版では保存操作は利用できません。");
}

function normalizeScheduleMasters(value = {}) {
  return {
    abilityDefinitions: Array.isArray(value.abilityDefinitions) ? value.abilityDefinitions : [],
    staffAbilities: value.staffAbilities || {},
    weeklyAvailability: Array.isArray(value.weeklyAvailability) ? value.weeklyAvailability : [],
    originalPrograms: Array.isArray(value.originalPrograms) ? value.originalPrograms : [],
  };
}

async function loadStaticScheduleMasters() {
  try {
    const response = await fetch("./data/schedule-masters.json", { cache: "no-cache" });
    return normalizeScheduleMasters(await response.json());
  } catch {
    return normalizeScheduleMasters();
  }
}

function publicStaticUser(user) {
  const { pin, ...publicUser } = user;
  return publicUser;
}

async function loadStaticStore() {
  if (staticStoreCache) return staticStoreCache;

  try {
    const saved = JSON.parse(localStorage.getItem(STATIC_STORE_KEY) || "null");
    if (saved) {
      staticStoreCache = saved;
      return staticStoreCache;
    }
  } catch {
    localStorage.removeItem(STATIC_STORE_KEY);
  }

  const response = await fetch("./data/store.json", { cache: "no-cache" });
  staticStoreCache = await response.json();
  localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(staticStoreCache));
  return staticStoreCache;
}

function generateClientMonthSchedule(month, store = null) {
  const { year, monthIndex } = parseMonth(month);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const schedule = {};
  const assignmentCounts = new Map(staffMembers.map((staff) => [staff.id, 0]));

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    const iso = formatISO(date);
    schedule[iso] = {};

    shiftSlots.forEach((slot) => {
      const program = getOriginalProgramForDateSlot(iso, slot);
      const staffIds = program
        ? getOriginalProgramStaffIds(program)
        : pickClientAvailableStaff(date, slot, schedule[iso], assignmentCounts, store);
      schedule[iso][slot.id] = staffIds;
      staffIds.forEach((staffId) => assignmentCounts.set(staffId, (assignmentCounts.get(staffId) || 0) + 1));
    });
  }

  return schedule;
}

function pickClientAvailableStaff(date, slot, daySchedule, assignmentCounts, store) {
  const iso = formatISO(date);
  const hour = getSlotHour(slot);
  const weekday = date.getDay();
  const availableStaffIds = getMasterAvailableStaffIds(weekday, hour);
  const explicitAvailableIds = getStoreAvailability(store)
    .filter((item) => item.date === iso && item.type === "available" && (item.slot === "all" || item.slot === slot.id))
    .map((item) => item.staffId);
  const pool = [...new Set([...explicitAvailableIds, ...availableStaffIds])].filter((staffId) => {
    return staffMembers.some((staff) => staff.id === staffId) && !hasClientOffConflict(staffId, iso, slot.id, store);
  });
  const fallbackPool = staffMembers.map((staff) => staff.id).filter((staffId) => !hasClientOffConflict(staffId, iso, slot.id, store));
  const candidates = pool.length ? pool : fallbackPool;
  const chosen = candidates
    .map((staffId) => {
      const dayCount = Object.values(daySchedule || {}).reduce((count, staffIds) => {
        return count + (Array.isArray(staffIds) && staffIds.includes(staffId) ? 1 : 0);
      }, 0);
      const profilePenalty = mentionsWeekday(store?.staffProfiles?.[staffId]?.unavailableNote || "", weekday) ? 20 : 0;
      const explicitBoost = explicitAvailableIds.includes(staffId) ? -8 : 0;
      const masterBoost = availableStaffIds.includes(staffId) ? -4 : 0;
      return {
        staffId,
        score: (assignmentCounts.get(staffId) || 0) * 10 + dayCount * 6 + profilePenalty + explicitBoost + masterBoost,
      };
    })
    .sort((a, b) => a.score - b.score || getStaffCode(a.staffId).localeCompare(getStaffCode(b.staffId)))[0];
  return chosen ? [chosen.staffId] : [];
}

function getOriginalProgramForDateSlot(dateValue, slot) {
  const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
  if (!date || Number.isNaN(date.getTime())) return null;
  const hour = getSlotHour(slot);
  const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
  return (scheduleMasters.originalPrograms || []).find((program) => {
    return Number(program.weekday) === date.getDay() && Number(program.hour) === hour && matchesWeekRule(program.weekRule, weekNumber);
  }) || null;
}

function getOriginalProgramStaffIds(program) {
  return ["P1", "MA", "P", "M", "A"]
    .map((ability) => program.assignments?.[ability])
    .filter(Boolean)
    .map(codeToStaffId)
    .filter(Boolean)
    .filter((staffId, index, array) => array.indexOf(staffId) === index)
    .slice(0, 2);
}

function getMasterAvailableStaffIds(weekday, hour) {
  return (scheduleMasters.weeklyAvailability || [])
    .filter((item) => Number(item.weekday) === weekday && (item.hours || []).map(Number).includes(hour))
    .map((item) => codeToStaffId(item.staffCode))
    .filter(Boolean);
}

function codeToStaffId(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "";
  const staff = staffMembers.find((item) => item.code === normalized || item.id.toUpperCase() === normalized);
  return staff?.id || "";
}

function getStaffCode(staffId) {
  return getStaff(staffId)?.code || staffId || "";
}

function getSlotHour(slot) {
  const fromId = String(slot?.id || "").match(/(\d{1,2})/);
  if (fromId) return Number(fromId[1]);
  const fromTime = String(slot?.time || slot?.label || "").match(/(\d{1,2})[:時]/);
  return fromTime ? Number(fromTime[1]) : 0;
}

function getStoreAvailability(store) {
  return Array.isArray(store?.availability) ? store.availability : state.availability || [];
}

function hasClientOffConflict(staffId, date, slotId, store) {
  return getStoreAvailability(store).some((item) => {
    return item.staffId === staffId && item.date === date && item.type === "off" && (item.slot === "all" || item.slot === slotId);
  });
}

function matchesWeekRule(rule, weekNumber) {
  const normalized = normalizeRuleText(rule);
  if (!normalized || normalized === "毎週") return true;
  const numbers = normalized.match(/\d+/g)?.map(Number) || [];
  return numbers.includes(weekNumber);
}

function normalizeRuleText(rule) {
  return String(rule || "")
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/[，、]/g, ",")
    .trim();
}

function normalizeMonth(month) {
  const text = String(month || "");
  const match = text.match(/^(\d{4})-(\d{1,2})/);
  if (!match) return monthKey(new Date());
  return `${match[1]}-${pad(Number(match[2]))}`;
}

function normalizeStaticStore(store) {
  const next = JSON.parse(JSON.stringify(store || {}));
  next.schedules ||= { draft: {}, final: {} };
  next.workflow ||= {};
  next.board = normalizeSlotReferences(next.board || []);
  next.availability = normalizeSlotReferences(next.availability || []);
  next.staffProfiles ||= {};
  next.contentItems ||= [];
  next.musicLibrary ||= [];
  next.musicSchedule ||= {};
  next.businessDocuments ||= [];
  const legacySlots = isLegacyShiftSlots(next.shiftSlots);
  next.shiftSlots = Array.isArray(next.shiftSlots) && next.shiftSlots.length && !legacySlots ? next.shiftSlots : staticShiftSlots;
  if (legacySlots) {
    next.schedules.draft = normalizeStaticScheduleMap(next.schedules.draft || {});
    next.schedules.final = normalizeStaticScheduleMap(next.schedules.final || {});
  }
  next.auditLog ||= [];
  next.updatedAt ||= new Date().toISOString();
  next.version ||= 1;
  return next;
}

function saveStaticStore(store) {
  staticStoreCache = store;
  localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(store));
}

function ensureStaticMonth(store, month) {
  store.schedules ||= { draft: {}, final: {} };
  store.workflow ||= {};
  if (!store.schedules.draft[month]) store.schedules.draft[month] = generateClientMonthSchedule(month, store);
  if (!store.workflow[month]) {
    store.workflow[month] = {
      draftSharedAt: null,
      finalizedAt: null,
      draftDeadline: "",
      finalDeadline: "",
      monthlyNote: "",
    };
  }
}

function isLegacyShiftSlots(slots) {
  if (!Array.isArray(slots) || !slots.length) return true;
  return slots.some((slot) => ["morning", "midday", "evening"].includes(slot.id));
}

function normalizeStaticScheduleMap(monthSchedules) {
  const result = {};
  Object.keys(monthSchedules || {}).forEach((month) => {
    result[month] = generateClientMonthSchedule(month, null);
  });
  return result;
}

function normalizeSlotReferences(items) {
  return items.map((item) => ({
    ...item,
    slot: normalizeLegacySlotId(item.slot),
  }));
}

function normalizeLegacySlotId(slotId) {
  if (slotId === "morning") return "hour_09";
  if (slotId === "midday") return "hour_12";
  if (slotId === "evening") return "hour_17";
  return slotId;
}

async function toggleNotifications() {
  if (!("Notification" in window)) {
    toast("このブラウザは通知に対応していません");
    return;
  }

  const permission = await Notification.requestPermission();
  const enabled = permission === "granted";
  localStorage.setItem(NOTIFY_KEY, enabled ? "enabled" : "disabled");
  updateNotificationButton();
  toast(enabled ? "通知を有効にしました" : "通知は許可されませんでした");
}

function updateNotificationButton() {
  const enabled = "Notification" in window && localStorage.getItem(NOTIFY_KEY) === "enabled" && Notification.permission === "granted";
  els.notifyButton.textContent = enabled ? "通知オン" : "通知を有効化";
}

function notify(title, body) {
  if (!("Notification" in window)) return;
  const enabled = localStorage.getItem(NOTIFY_KEY) === "enabled";
  if (!enabled || Notification.permission !== "granted" || document.hasFocus()) return;
  new Notification(title, { body, icon: "./icon.svg" });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
}

async function handleInstallClick() {
  if (isStandaloneApp()) {
    toast("すでにホーム画面アプリとして起動しています");
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    updateInstallButton();
    if (choice?.outcome === "accepted") toast("ホーム画面に追加しました");
    return;
  }

  if (isIosDevice()) {
    toast("Safariの共有ボタンから「ホーム画面に追加」を選んでください");
    return;
  }

  toast("ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください");
}

function handleAppInstalled() {
  deferredInstallPrompt = null;
  updateInstallButton();
  toast("ホーム画面に追加しました");
}

function updateInstallButton() {
  if (!els.installButton) return;
  const canShow = !isStandaloneApp() && (Boolean(deferredInstallPrompt) || isIosDevice());
  els.installButton.hidden = !canShow;
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
  window.clearTimeout(setSyncStatus.timer);
  setSyncStatus.timer = window.setTimeout(() => {
    els.syncStatus.textContent = eventSource ? "リアルタイム同期中" : "同期待機中";
  }, 2600);
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  els.toastRegion.append(node);
  window.setTimeout(() => node.remove(), 3200);
}

function clearSelect(select) {
  while (select.firstChild) select.firstChild.remove();
}

function permissionLabel(user) {
  if (user.permission === "admin") return "管理者";
  if (user.permission === "viewer") return "閲覧専用";
  return "スタッフ";
}

function isAdmin() {
  return currentUser?.permission === "admin";
}

function getDefaultSelectedDate(month) {
  const todayIso = formatISO(new Date());
  return todayIso.startsWith(month) ? todayIso : `${month}-01`;
}

function getCalendarDates(month) {
  const { year, monthIndex } = parseMonth(month);
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const endOffset = 6 - ((last.getDay() + 6) % 7);
  const start = addDays(first, -startOffset);
  const end = addDays(last, endOffset);
  const dates = [];

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(new Date(cursor));
  }

  return dates;
}

function parseMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseISO(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateShort(iso) {
  const date = parseISO(iso);
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdayLabels[date.getDay()]}）`;
}

function formatDateForSpeech(iso) {
  const date = parseISO(iso);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabels[date.getDay()]}曜日`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getStaff(id) {
  return staffMembers.find((staff) => staff.id === id);
}

function getSlot(id) {
  return shiftSlots.find((slot) => slot.id === id);
}

function uniqueStaff(ids) {
  return [...new Set(ids.filter(Boolean))];
}

function cloneSchedule(schedule) {
  return JSON.parse(JSON.stringify(schedule || {}));
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function getBusinessDocument(id) {
  return (state.businessDocuments || []).find((item) => item.id === id);
}

function buildDocumentSendText(item) {
  const typeLabel = documentTypeLabels[item.type] || "書類";
  const contact = item.contact || "ご担当者様";
  const amountLine = item.amount ? `金額: ${formatMoney(item.amount)}` : "";
  const dueLine = item.dueDate ? `期限: ${formatDateShort(item.dueDate)}` : "";
  return [
    `${item.client}`,
    `${contact}`,
    "",
    "いつもお世話になっております。FM大師です。",
    `下記の${typeLabel}を送付いたします。`,
    "",
    `件名: ${item.title}`,
    `発行日: ${formatDateShort(item.issueDate)}`,
    amountLine || null,
    dueLine || null,
    item.fileRef ? `添付・保管先: ${item.fileRef}` : null,
    "",
    "内容をご確認いただき、ご不明点がございましたらお知らせください。",
    "何卒よろしくお願いいたします。",
  ].filter((line) => line !== null).join("\n");
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "金額なし";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
}

function documentStatusClass(status) {
  if (status === "sent" || status === "paid") return "applied";
  if (status === "ready") return "pending";
  if (status === "cancelled") return "rejected";
  return "open";
}

function statusClassName(status) {
  if (status === "pendingApproval" || status === "pendingConsent") return "pending";
  if (status === "applied") return "applied";
  if (status === "rejected") return "rejected";
  return "open";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
