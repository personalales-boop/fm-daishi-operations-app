const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const SCHEDULE_MASTER_FILE = path.join(DATA_DIR, "schedule-masters.json");
const MAX_BODY_BYTES = 1024 * 1024;

const scheduleMasters = loadScheduleMasters();
const defaultShiftSlots = createDefaultShiftSlots();

const staffMembers = [
  createStaff("shimizu", "SH", "清水 暁", "#1a73e8"),
  createStaff("suyama", "SY", "須山 成美", "#ea4335"),
  createStaff("sakamoto_tadashi", "SK", "坂本 匡", "#fbbc04"),
  createStaff("sakamoto_yumiko", "YS", "坂本 由美子", "#34a853"),
  createStaff("aoki", "AO", "青木 朋美", "#4285f4"),
  createStaff("madokawa", "MD", "窓川 唯良", "#9c27b0"),
  createStaff("sato_takashi", "ST", "佐藤 隆", "#00acc1"),
  createStaff("kaminaga", "KG", "神永 直樹", "#0f9d58"),
  createStaff("tazawa", "TZ", "田沢 一郎", "#ff7043"),
  createStaff("uruchida", "UR", "粳田 浩介", "#7cb342"),
  createStaff("is", "IS", "IS（氏名未設定）", "#5f6368"),
];

const adminStaffIds = new Set(["shimizu", "suyama"]);
const initialPins = {
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

const loginUsers = staffMembers.map((staff) => ({
  id: staff.id,
  staffId: staff.id,
  name: staff.name,
  role: staff.role,
  permission: adminStaffIds.has(staff.id) ? "admin" : "staff",
  pin: initialPins[staff.id],
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

let shiftSlots = defaultShiftSlots.map((slot) => ({ ...slot }));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const sessions = new Map();
const eventClients = new Set();
let store = loadStore();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "サーバーでエラーが発生しました。" });
  }
});

server.listen(PORT, () => {
  console.log(`FM Daishi shift app running at http://localhost:${PORT}`);
});

function loadScheduleMasters() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SCHEDULE_MASTER_FILE, "utf8"));
    return {
      abilityDefinitions: Array.isArray(parsed.abilityDefinitions) ? parsed.abilityDefinitions : [],
      staffAbilities: parsed.staffAbilities || {},
      weeklyAvailability: Array.isArray(parsed.weeklyAvailability) ? parsed.weeklyAvailability : [],
      originalPrograms: Array.isArray(parsed.originalPrograms) ? parsed.originalPrograms : [],
    };
  } catch {
    return {
      abilityDefinitions: [],
      staffAbilities: {},
      weeklyAvailability: [],
      originalPrograms: [],
    };
  }
}

function createDefaultShiftSlots() {
  return Array.from({ length: 9 }, (_, index) => {
    const hour = index + 9;
    return {
      id: `hour_${pad(hour)}`,
      label: `${pad(hour)}:00枠`,
      short: `${hour}時`,
      time: `${pad(hour)}:00-${pad(hour + 1)}:00`,
      className: "hour-slot",
    };
  });
}

function createStaff(id, code, name, color) {
  return {
    id,
    code,
    name,
    role: "パーソナリティ",
    abilities: scheduleMasters.staffAbilities?.[id] || [],
    color,
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, {
      staffMembers,
      shiftSlots,
      scheduleMasters,
      users: loginUsers.map(publicUser),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJsonBody(req);
    const user = loginUsers.find((item) => item.id === body.userId && item.pin === String(body.pin || ""));
    if (!user) {
      sendJson(res, 401, { error: "ログインIDまたはPINが違います。" });
      return;
    }

    const token = crypto.randomUUID();
    const sessionUser = publicUser(user);
    sessions.set(token, { token, user: sessionUser, createdAt: new Date().toISOString() });
    sendJson(res, 200, { token, user: sessionUser });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    const session = requireSession(req, url);
    if (!session) {
      sendJson(res, 401, { error: "ログインが必要です。" });
      return;
    }

    attachEventClient(req, res);
    return;
  }

  const session = requireSession(req, url);
  if (!session) {
    sendJson(res, 401, { error: "ログインが必要です。" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    ensureMonth(store, getRequestedMonth(url));
    saveAndBroadcast(false);
    sendJson(res, 200, { state: store, user: session.user, serverTime: new Date().toISOString() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/board") {
    const body = await readJsonBody(req);
    const post = createBoardPost(body, session.user);
    if (post.error) {
      sendJson(res, 400, { error: post.error });
      return;
    }

    ensureMonth(store, monthKey(parseISO(post.date)));
    store.board.unshift(post);
    addAudit(session.user, "掲示板投稿", buildPostAuditText(post));
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, post });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/approval") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "承認操作は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = updateApproval(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, post: result.post });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/swap-consent") {
    const body = await readJsonBody(req);
    const result = updateSwapConsent(body, session.user);
    if (result.error) {
      sendJson(res, result.status || 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, post: result.post });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/availability") {
    const body = await readJsonBody(req);
    const result = upsertAvailability(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, item: result.item });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/shift") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "シフト編集は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = updateShift(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/slots") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "番組枠マスタ編集は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = updateSlots(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/staff-profile") {
    const body = await readJsonBody(req);
    const result = updateStaffProfile(body, session.user);
    if (result.error) {
      sendJson(res, result.status || 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, profile: result.profile });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/import-schedule") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "CSV取り込みは管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = importSchedule(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error, details: result.details || [] });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, imported: result.imported, skipped: result.skipped });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/share-draft") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "仮シフト共有は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const month = normalizeMonth(body.month);
    ensureMonth(store, month);
    store.workflow[month].draftSharedAt = new Date().toISOString();
    store.board.unshift(createSystemPost(month, "notice", "仮シフトを全スタッフへ共有しました。確認後、変更依頼は掲示板で受け付けます。", session.user));
    addAudit(session.user, "仮シフト共有", `${formatMonthLabel(month)}の仮シフトを共有しました。`);
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/workflow-settings") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "月次締切メモの編集は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const month = normalizeMonth(body.month);
    ensureMonth(store, month);
    const workflow = store.workflow[month];
    workflow.draftDeadline = isValidDate(body.draftDeadline) ? String(body.draftDeadline) : "";
    workflow.finalDeadline = isValidDate(body.finalDeadline) ? String(body.finalDeadline) : "";
    workflow.monthlyNote = String(body.monthlyNote || "").trim();
    addAudit(session.user, "月次締切メモ更新", `${formatMonthLabel(month)}の締切メモを更新しました。`);
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/finalize") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "確定シフト作成は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const month = normalizeMonth(body.month);
    ensureMonth(store, month);
    store.schedules.final[month] = cloneSchedule(store.schedules.draft[month]);
    store.workflow[month].finalizedAt = new Date().toISOString();
    store.board.unshift(createSystemPost(month, "notice", "確定シフトを提出しました。以後の交代は掲示板の交換成立申請から承認します。", session.user));
    addAudit(session.user, "確定シフト作成", `${formatMonthLabel(month)}の確定シフトを作成しました。`);
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auto-draft") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "仮シフト自動作成は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const month = normalizeMonth(body.month);
    ensureMonth(store, month);
    store.schedules.draft[month] = generateMonthSchedule(month, store);
    store.workflow[month].draftSharedAt = null;
    addAudit(session.user, "仮シフト自動作成", `${formatMonthLabel(month)}の仮シフトを作り直しました。`);
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/content-item") {
    const body = await readJsonBody(req);
    const result = upsertContentItem(body, session.user);
    if (result.error) {
      sendJson(res, result.status || 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, item: result.item });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/music-track") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "CD台帳の編集は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = upsertMusicTrack(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, track: result.track });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/import-music") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "CD台帳のCSV取り込みは管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = importMusicLibrary(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error, details: result.details || [] });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, imported: result.imported, updated: result.updated, skipped: result.skipped });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/music-generate-schedule") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "選曲作成は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = generateMusicScheduleForDate(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, selection: result.selection });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/music-schedule") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "選曲予定の編集は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = updateMusicSchedule(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, selection: result.selection });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/business-document") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "書類送付管理は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = upsertBusinessDocument(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, document: result.document });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/business-document-status") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "書類送付管理は管理者のみ行えます。" });
      return;
    }

    const body = await readJsonBody(req);
    const result = updateBusinessDocumentStatus(body, session.user);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    saveAndBroadcast(true);
    sendJson(res, 200, { state: store, document: result.document });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset-demo") {
    if (!isAdmin(session.user)) {
      sendJson(res, 403, { error: "デモデータリセットは管理者のみ行えます。" });
      return;
    }

    store = createDefaultStore();
    addAudit(session.user, "デモデータリセット", "保存データを初期状態に戻しました。");
    saveAndBroadcast(true);
    sendJson(res, 200, { state: store });
    return;
  }

  sendJson(res, 404, { error: "APIが見つかりません。" });
}

function createBoardPost(body, user) {
  const type = String(body.type || "");
  const date = String(body.date || "");
  const slot = String(body.slot || "");
  const fromStaff = isAdmin(user) ? String(body.fromStaff || "") : user.staffId;
  const toStaff = String(body.toStaff || "");

  if (!["absence", "swapRequest", "swapConfirmed", "notice"].includes(type)) {
    return { error: "投稿種別が正しくありません。" };
  }
  if (!isValidDate(date)) return { error: "日付が正しくありません。" };
  if (!shiftSlots.some((item) => item.id === slot)) return { error: "担当枠が正しくありません。" };
  if (!staffMembers.some((item) => item.id === fromStaff)) return { error: "対象スタッフが正しくありません。" };
  if (toStaff && !staffMembers.some((item) => item.id === toStaff)) return { error: "交代スタッフが正しくありません。" };
  if (type === "swapConfirmed" && !toStaff) return { error: "交換成立申請には交代スタッフが必要です。" };
  if (toStaff && fromStaff === toStaff) return { error: "同じスタッフ同士では交換できません。" };

  return {
    id: crypto.randomUUID(),
    type,
    date,
    slot,
    fromStaff,
    toStaff,
    message: String(body.message || "").trim() || buildDefaultMessage({ type, date, slot, fromStaff, toStaff }),
    status: getInitialPostStatus(type, fromStaff, toStaff, user),
    createdBy: user.id,
    createdByName: user.name,
    createdAt: new Date().toISOString(),
    appliedAt: null,
    consentBy: null,
    consentAt: null,
    declinedBy: null,
    declinedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
  };
}

function getInitialPostStatus(type, fromStaff, toStaff, user) {
  if (type !== "swapConfirmed") return "open";
  if (isAdmin(user) || user.staffId === toStaff) return "pendingApproval";
  return "pendingConsent";
}

function updateSwapConsent(body, user) {
  const post = store.board.find((item) => item.id === body.id);
  if (!post) return { error: "対象の申請が見つかりません。" };
  if (post.type !== "swapConfirmed") return { error: "交換成立申請ではありません。" };
  if (post.status !== "pendingConsent") return { error: "承諾待ちの申請ではありません。" };
  if (!isAdmin(user) && user.staffId !== post.toStaff) {
    return { status: 403, error: "交換相手だけが承諾できます。" };
  }

  if (body.decision === "consent") {
    post.status = "pendingApproval";
    post.consentAt = new Date().toISOString();
    post.consentBy = user.id;
    addAudit(user, "交換相手承諾", buildPostAuditText(post));
    return { post };
  }

  if (body.decision === "decline") {
    post.status = "rejected";
    post.declinedAt = new Date().toISOString();
    post.declinedBy = user.id;
    addAudit(user, "交換相手辞退", buildPostAuditText(post));
    return { post };
  }

  return { error: "承諾結果が正しくありません。" };
}

function updateApproval(body, user) {
  const post = store.board.find((item) => item.id === body.id);
  if (!post) return { error: "対象の申請が見つかりません。" };
  if (post.type !== "swapConfirmed") return { error: "交換成立申請ではありません。" };
  if (post.status !== "pendingApproval") return { error: "すでに処理済みです。" };

  if (body.decision === "approve") {
    applySwap(post);
    post.status = "applied";
    post.appliedAt = new Date().toISOString();
    post.approvedAt = post.appliedAt;
    post.approvedBy = user.id;
    addAudit(user, "交換承認", buildPostAuditText(post));
    return { post };
  }

  if (body.decision === "reject") {
    post.status = "rejected";
    post.rejectedAt = new Date().toISOString();
    post.rejectedBy = user.id;
    addAudit(user, "交換却下", buildPostAuditText(post));
    return { post };
  }

  return { error: "承認結果が正しくありません。" };
}

function updateShift(body, user) {
  const date = String(body.date || "");
  const slot = String(body.slot || "");
  const view = body.view === "final" ? "final" : "draft";
  const staffIds = Array.isArray(body.staffIds) ? body.staffIds.filter(Boolean) : [];

  if (!isValidDate(date)) return { error: "日付が正しくありません。" };
  if (!shiftSlots.some((item) => item.id === slot)) return { error: "担当枠が正しくありません。" };
  if (!staffIds.every((id) => staffMembers.some((staff) => staff.id === id))) {
    return { error: "スタッフ指定が正しくありません。" };
  }

  const month = monthKey(parseISO(date));
  ensureMonth(store, month);
  if (!store.schedules[view][month]) {
    store.schedules[view][month] = cloneSchedule(store.schedules.draft[month]);
  }
  store.schedules[view][month][date][slot] = [...new Set(staffIds)].slice(0, 2);
  addAudit(user, "シフト編集", `${formatDateShort(date)} ${getSlot(slot).label}を更新しました。`);
  return { ok: true };
}

function upsertAvailability(body, user) {
  const date = String(body.date || "");
  const slot = String(body.slot || "all");
  const type = String(body.type || "");
  const staffId = isAdmin(user) && body.staffId ? String(body.staffId) : user.staffId;

  if (!isValidDate(date)) return { error: "日付が正しくありません。" };
  if (!["off", "available", "note"].includes(type)) return { error: "希望種別が正しくありません。" };
  if (slot !== "all" && !shiftSlots.some((item) => item.id === slot)) return { error: "担当枠が正しくありません。" };
  if (!staffMembers.some((staff) => staff.id === staffId)) return { error: "スタッフ指定が正しくありません。" };

  const existing = store.availability.find((item) => {
    return item.staffId === staffId && item.date === date && item.slot === slot && item.type === type;
  });
  const item = existing || {
    id: crypto.randomUUID(),
    staffId,
    date,
    slot,
    type,
    createdAt: new Date().toISOString(),
  };
  item.note = String(body.note || "").trim();
  item.updatedAt = new Date().toISOString();
  item.updatedBy = user.id;

  if (!existing) store.availability.unshift(item);
  store.availability = store.availability.slice(0, 500);
  addAudit(user, "希望提出", `${formatDateShort(date)} ${availabilityTypeLabel(type)}を登録しました。`);
  return { item };
}

function updateSlots(body, user) {
  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (!slots.length) return { error: "番組枠がありません。" };

  const nextSlots = [];
  for (const [index, slot] of slots.entries()) {
    const id = String(slot.id || `slot_${index + 1}`).trim();
    const label = String(slot.label || "").trim();
    const short = String(slot.short || "").trim();
    const time = String(slot.time || "").trim();
    const className = String(slot.className || id).trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return { error: "番組枠IDは英数字で入力してください。" };
    if (!label || !short || !time) return { error: "番組枠の名称、短縮名、時間は必須です。" };
    nextSlots.push({ id, label, short, time, className });
  }

  if (new Set(nextSlots.map((slot) => slot.id)).size !== nextSlots.length) {
    return { error: "番組枠IDが重複しています。" };
  }

  shiftSlots = nextSlots;
  store.shiftSlots = nextSlots;
  Object.keys(store.schedules.draft).forEach((month) => ensureScheduleSlots(store.schedules.draft[month]));
  Object.keys(store.schedules.final).forEach((month) => ensureScheduleSlots(store.schedules.final[month]));
  addAudit(user, "番組枠マスタ更新", `番組枠を${nextSlots.length}件に更新しました。`);
  return { ok: true };
}

function updateStaffProfile(body, user) {
  const staffId = String(body.staffId || user.staffId);
  if (!isAdmin(user) && staffId !== user.staffId) {
    return { status: 403, error: "他のスタッフ情報は編集できません。" };
  }
  if (!staffMembers.some((staff) => staff.id === staffId)) {
    return { error: "スタッフ指定が正しくありません。" };
  }

  const profile = {
    ...(store.staffProfiles[staffId] || {}),
    staffId,
    contact: String(body.contact || "").trim(),
    skills: String(body.skills || "").trim(),
    unavailableNote: String(body.unavailableNote || "").trim(),
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  };
  store.staffProfiles[staffId] = profile;
  addAudit(user, "スタッフ情報更新", `${getStaff(staffId).name}さんの情報を更新しました。`);
  return { profile };
}

function upsertContentItem(body, user) {
  const id = String(body.id || "").trim();
  const date = String(body.date || "").trim();
  const title = String(body.title || "").trim();
  const program = String(body.program || "").trim();
  const type = String(body.type || "script").trim();

  if (!title) return { error: "タイトルを入力してください。" };
  if (!isValidDate(date)) return { error: "放送日が正しくありません。" };
  if (!["script", "transcript", "memo"].includes(type)) return { error: "資料の種類が正しくありません。" };

  const existing = id ? store.contentItems.find((item) => item.id === id) : null;
  if (existing && !isAdmin(user) && existing.createdBy !== user.id) {
    return { status: 403, error: "他のスタッフが作成した資料は編集できません。" };
  }

  const item = existing || {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    createdByName: user.name,
  };
  item.date = date;
  item.program = program;
  item.type = type;
  item.title = title;
  item.tags = normalizeTextList(body.tags);
  item.source = String(body.source || "").trim();
  item.body = String(body.body || "").trim();
  item.transcript = String(body.transcript || "").trim();
  item.updatedAt = new Date().toISOString();
  item.updatedBy = user.id;
  item.updatedByName = user.name;

  if (!existing) store.contentItems.unshift(item);
  store.contentItems.sort((a, b) => String(b.date).localeCompare(String(a.date)) || new Date(b.updatedAt) - new Date(a.updatedAt));
  store.contentItems = store.contentItems.slice(0, 1000);
  addAudit(user, existing ? "放送資料更新" : "放送資料登録", `${formatDateShort(date)} ${title}を保存しました。`);
  return { item };
}

function upsertMusicTrack(body, user) {
  const id = String(body.id || "").trim();
  const title = String(body.title || "").trim();
  const artist = String(body.artist || "").trim();
  if (!title) return { error: "曲名を入力してください。" };

  const existing = id ? store.musicLibrary.find((track) => track.id === id) : null;
  const track = existing || {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  };
  track.cdCode = String(body.cdCode || "").trim();
  track.shelf = String(body.shelf || "").trim();
  track.trackNo = String(body.trackNo || "").trim();
  track.title = title;
  track.artist = artist || "アーティスト未設定";
  track.genre = String(body.genre || "").trim();
  track.season = String(body.season || "").trim() || "通年";
  track.mood = String(body.mood || "").trim();
  track.themes = normalizeTextList(body.themes || body.theme || body.mood);
  track.notes = String(body.notes || "").trim();
  track.updatedAt = new Date().toISOString();
  track.updatedBy = user.id;

  if (!existing) store.musicLibrary.unshift(track);
  store.musicLibrary.sort(compareMusicTracks);
  addAudit(user, existing ? "CD台帳更新" : "CD台帳登録", `${track.title} / ${track.artist}を保存しました。`);
  return { track };
}

function importMusicLibrary(body, user) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const details = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  if (!rows.length) return { error: "CSVに取り込める楽曲がありません。" };

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const title = String(row.title || "").trim();
    if (!title) {
      skipped += 1;
      details.push(`${lineNumber}行目: 曲名がありません。`);
      return;
    }

    const normalized = {
      cdCode: String(row.cdCode || "").trim(),
      shelf: String(row.shelf || "").trim(),
      trackNo: String(row.trackNo || "").trim(),
      title,
      artist: String(row.artist || "").trim() || "アーティスト未設定",
      genre: String(row.genre || "").trim(),
      season: String(row.season || "").trim() || "通年",
      mood: String(row.mood || "").trim(),
      themes: normalizeTextList(row.themes || row.theme || row.mood),
      notes: String(row.notes || "").trim(),
    };
    const existing = findMatchingTrack(normalized);
    const target = existing || {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };
    Object.assign(target, normalized, {
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    });

    if (existing) {
      updated += 1;
    } else {
      store.musicLibrary.push(target);
      imported += 1;
    }
  });

  if (!imported && !updated) {
    return { error: "取り込める楽曲がありませんでした。", details };
  }

  store.musicLibrary.sort(compareMusicTracks);
  addAudit(user, "CD台帳CSV取り込み", `楽曲を${imported}件追加、${updated}件更新しました。`);
  return { imported, updated, skipped, details };
}

function generateMusicScheduleForDate(body, user) {
  const date = String(body.date || "").trim();
  const theme = String(body.theme || "").trim();
  const count = Math.min(Math.max(Number(body.count || 30), 1), 50);

  if (!isValidDate(date)) return { error: "選曲日が正しくありません。" };
  if (!store.musicLibrary.length) return { error: "CD台帳に楽曲がありません。" };

  const month = monthKey(parseISO(date));
  ensureMonth(store, month);
  const selected = pickTracksForDate(date, theme, count);
  const selection = {
    date,
    theme: theme || inferSeasonTheme(date),
    count: selected.length,
    trackIds: selected.map((track) => track.id),
    generatedAt: new Date().toISOString(),
    generatedBy: user.id,
  };
  store.musicSchedule[month][date] = selection;
  addAudit(user, "選曲自動作成", `${formatDateShort(date)}の選曲を${selected.length}曲作成しました。`);
  return { selection };
}

function updateMusicSchedule(body, user) {
  const date = String(body.date || "").trim();
  const trackIds = Array.isArray(body.trackIds) ? body.trackIds.map(String).filter(Boolean) : [];
  if (!isValidDate(date)) return { error: "選曲日が正しくありません。" };
  if (!trackIds.every((id) => store.musicLibrary.some((track) => track.id === id))) {
    return { error: "CD台帳にない曲が含まれています。" };
  }

  const month = monthKey(parseISO(date));
  ensureMonth(store, month);
  const selection = {
    date,
    theme: String(body.theme || "").trim(),
    count: trackIds.length,
    trackIds: [...new Set(trackIds)],
    generatedAt: new Date().toISOString(),
    generatedBy: user.id,
  };
  store.musicSchedule[month][date] = selection;
  addAudit(user, "選曲編集", `${formatDateShort(date)}の選曲を${trackIds.length}曲に更新しました。`);
  return { selection };
}

function upsertBusinessDocument(body, user) {
  const id = String(body.id || "").trim();
  const type = String(body.type || "").trim();
  const issueDate = String(body.issueDate || "").trim();
  const dueDate = String(body.dueDate || "").trim();
  const client = String(body.client || "").trim();
  const title = String(body.title || "").trim();
  const status = String(body.status || "draft").trim();
  const amount = normalizeAmount(body.amount);

  if (!["estimate", "delivery", "invoice"].includes(type)) return { error: "書類種別が正しくありません。" };
  if (!isValidDate(issueDate)) return { error: "発行日が正しくありません。" };
  if (dueDate && !isValidDate(dueDate)) return { error: "期限日が正しくありません。" };
  if (!client) return { error: "送付先を入力してください。" };
  if (!title) return { error: "件名を入力してください。" };
  if (!["draft", "ready", "sent", "paid", "cancelled"].includes(status)) return { error: "ステータスが正しくありません。" };

  const existing = id ? store.businessDocuments.find((item) => item.id === id) : null;
  const document = existing || {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    createdByName: user.name,
    sentAt: null,
    paidAt: null,
  };

  document.type = type;
  document.issueDate = issueDate;
  document.dueDate = dueDate || "";
  document.client = client;
  document.contact = String(body.contact || "").trim();
  document.title = title;
  document.amount = amount;
  document.status = status;
  document.fileRef = String(body.fileRef || "").trim();
  document.memo = String(body.memo || "").trim();
  document.updatedAt = new Date().toISOString();
  document.updatedBy = user.id;
  document.updatedByName = user.name;
  if (status === "sent" && !document.sentAt) document.sentAt = document.updatedAt;
  if (status === "paid" && !document.paidAt) document.paidAt = document.updatedAt;

  if (!existing) store.businessDocuments.unshift(document);
  store.businessDocuments.sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)) || new Date(b.updatedAt) - new Date(a.updatedAt));
  addAudit(user, existing ? "書類送付情報更新" : "書類送付情報登録", `${businessDocumentTypeLabel(type)} ${client} / ${title}を保存しました。`);
  return { document };
}

function updateBusinessDocumentStatus(body, user) {
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const document = store.businessDocuments.find((item) => item.id === id);
  if (!document) return { error: "対象の書類が見つかりません。" };
  if (!["draft", "ready", "sent", "paid", "cancelled"].includes(status)) return { error: "ステータスが正しくありません。" };

  document.status = status;
  document.updatedAt = new Date().toISOString();
  document.updatedBy = user.id;
  document.updatedByName = user.name;
  if (status === "sent") document.sentAt = document.updatedAt;
  if (status === "paid") document.paidAt = document.updatedAt;
  addAudit(user, "書類ステータス更新", `${businessDocumentTypeLabel(document.type)} ${document.client} / ${document.title}を${businessDocumentStatusLabel(status)}にしました。`);
  return { document };
}

function normalizeAmount(value) {
  const amount = Number(String(value || "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function businessDocumentTypeLabel(type) {
  if (type === "estimate") return "見積書";
  if (type === "delivery") return "納品書";
  return "請求書";
}

function businessDocumentStatusLabel(status) {
  if (status === "ready") return "送付待ち";
  if (status === "sent") return "送付済み";
  if (status === "paid") return "入金済み";
  if (status === "cancelled") return "取り下げ";
  return "下書き";
}

function pickTracksForDate(date, theme, count) {
  const keywords = getSelectionKeywords(date, theme);
  const recent = getRecentlyPlayedTrackIds(date, 14);
  return [...store.musicLibrary]
    .map((track, index) => ({
      track,
      score: scoreTrack(track, keywords, recent, date, index),
    }))
    .sort((a, b) => b.score - a.score || compareMusicTracks(a.track, b.track))
    .slice(0, Math.min(count, store.musicLibrary.length))
    .map((item) => item.track);
}

function scoreTrack(track, keywords, recent, date, index) {
  const text = normalizeSearchText([track.title, track.artist, track.genre, track.season, track.mood, ...(track.themes || []), track.notes].join(" "));
  let score = 20;
  keywords.forEach((keyword) => {
    if (keyword && text.includes(normalizeSearchText(keyword))) score += 16;
  });
  if (recent.has(track.id)) score -= 22;
  score += stableHash(`${date}:${track.id || index}`) % 11;
  if (String(track.season || "").includes("通年")) score += 2;
  return score;
}

function getSelectionKeywords(date, theme) {
  const month = parseISO(date).getMonth() + 1;
  const base = normalizeTextList(theme);
  const seasonal = {
    1: ["新年", "冬", "晴れ", "希望"],
    2: ["冬", "バレンタイン", "落ち着く"],
    3: ["春", "卒業", "旅立ち"],
    4: ["春", "新生活", "桜"],
    5: ["初夏", "爽やか", "休日"],
    6: ["ジューンブライド", "結婚式", "雨", "初夏"],
    7: ["夏", "海", "祭り", "青空"],
    8: ["夏", "海", "花火", "夕暮れ"],
    9: ["秋", "始まり", "落ち着く"],
    10: ["秋", "読書", "散歩"],
    11: ["晩秋", "ぬくもり", "夜"],
    12: ["冬", "クリスマス", "年末"],
  };
  return [...new Set([...base, ...(seasonal[month] || [])])];
}

function inferSeasonTheme(date) {
  const month = parseISO(date).getMonth() + 1;
  if (month === 6) return "ジューンブライド・雨・初夏";
  if (month === 7 || month === 8) return "夏・海・祭り";
  if (month === 9) return "秋の始まり";
  if ([3, 4, 5].includes(month)) return "春・新生活";
  if ([12, 1, 2].includes(month)) return "冬・年末年始";
  return "季節のおすすめ";
}

function getRecentlyPlayedTrackIds(date, lookbackDays) {
  const target = parseISO(date);
  const recent = new Set();
  Object.values(store.musicSchedule || {}).forEach((monthSchedule) => {
    Object.entries(monthSchedule || {}).forEach(([scheduledDate, selection]) => {
      const diff = Math.round((target - parseISO(scheduledDate)) / 86400000);
      if (diff <= 0 || diff > lookbackDays) return;
      (selection.trackIds || []).forEach((id) => recent.add(id));
    });
  });
  return recent;
}

function findMatchingTrack(candidate) {
  const titleKey = normalizeSearchText(candidate.title);
  const artistKey = normalizeSearchText(candidate.artist);
  return store.musicLibrary.find((track) => {
    const sameCd = candidate.cdCode && track.cdCode === candidate.cdCode && String(track.trackNo || "") === String(candidate.trackNo || "");
    const sameTitle = normalizeSearchText(track.title) === titleKey && normalizeSearchText(track.artist) === artistKey;
    return sameCd || sameTitle;
  });
}

function compareMusicTracks(a, b) {
  return String(a.cdCode || "").localeCompare(String(b.cdCode || ""), "ja", { numeric: true }) ||
    String(a.trackNo || "").localeCompare(String(b.trackNo || ""), "ja", { numeric: true }) ||
    String(a.title || "").localeCompare(String(b.title || ""), "ja");
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[、,\n/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function stableHash(value) {
  return String(value || "").split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function ensureScheduleSlots(schedule) {
  Object.values(schedule || {}).forEach((daySchedule) => {
    shiftSlots.forEach((slot) => {
      if (!Array.isArray(daySchedule[slot.id])) daySchedule[slot.id] = [];
    });
    Object.keys(daySchedule).forEach((slotId) => {
      if (!shiftSlots.some((slot) => slot.id === slotId)) delete daySchedule[slotId];
    });
  });
}

function availabilityTypeLabel(type) {
  if (type === "off") return "希望休";
  if (type === "available") return "出勤可能";
  return "勤務メモ";
}

function importSchedule(body, user) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const view = body.view === "final" ? "final" : "draft";
  const month = normalizeMonth(body.month);
  const mode = body.mode === "replaceMonth" ? "replaceMonth" : "merge";
  const details = [];

  if (!rows.length) {
    return { error: "CSVに取り込める行がありません。" };
  }

  ensureMonth(store, month);
  if (!store.schedules[view][month] || mode === "replaceMonth") {
    store.schedules[view][month] = mode === "replaceMonth" ? createEmptyMonthSchedule(month) : cloneSchedule(store.schedules.draft[month]);
  }

  let imported = 0;
  let skipped = 0;

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const date = normalizeDateValue(row.date);
    const slot = normalizeSlotValue(row.slot);
    const primary = normalizeStaffValue(row.primary);
    const support = normalizeStaffValue(row.support);

    if (!date || !date.startsWith(month)) {
      skipped += 1;
      details.push(`${lineNumber}行目: 対象月ではない日付です。`);
      return;
    }
    if (!slot) {
      skipped += 1;
      details.push(`${lineNumber}行目: 担当枠が見つかりません。`);
      return;
    }
    if (!primary && !support) {
      skipped += 1;
      details.push(`${lineNumber}行目: 担当者が見つかりません。`);
      return;
    }

    const staffIds = [...new Set([primary, support].filter(Boolean))].slice(0, 2);
    store.schedules[view][month][date][slot] = staffIds;
    imported += 1;
  });

  if (!imported) {
    return { error: "取り込めるシフト行がありませんでした。", details };
  }

  addAudit(
    user,
    "CSVシフト取り込み",
    `${formatMonthLabel(month)}の${view === "draft" ? "仮シフト" : "確定シフト"}へ${imported}件反映しました。`,
  );
  return { imported, skipped, details };
}

function normalizeDateValue(value) {
  const text = String(value || "").trim().replaceAll("/", "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return formatISO(new Date(year, month - 1, day));
  }
  return "";
}

function normalizeSlotValue(value) {
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

function normalizeStaffValue(value) {
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

function createEmptyMonthSchedule(month) {
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

function applySwap(post) {
  const month = monthKey(parseISO(post.date));
  ensureMonth(store, month);
  const workflow = store.workflow[month];
  const scheduleKey = workflow.finalizedAt ? "final" : "draft";

  if (!store.schedules[scheduleKey][month]) {
    store.schedules[scheduleKey][month] = cloneSchedule(store.schedules.draft[month]);
  }

  const daySchedule = store.schedules[scheduleKey][month][post.date];
  const existing = daySchedule[post.slot] || [];
  let nextStaff = existing.map((id) => (id === post.fromStaff ? post.toStaff : id));

  if (!nextStaff.includes(post.toStaff)) {
    nextStaff = [post.toStaff, ...nextStaff];
  }

  daySchedule[post.slot] = [...new Set(nextStaff.filter(Boolean))].slice(0, 2);
}

function attachEventClient(req, res) {
  res.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  eventClients.add(res);
  req.on("close", () => {
    eventClients.delete(res);
  });
}

function broadcastUpdate() {
  const payload = JSON.stringify({ type: "updated", at: new Date().toISOString(), version: store.version });
  for (const client of eventClients) {
    client.write(`event: update\ndata: ${payload}\n\n`);
  }
}

function loadStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    const next = createDefaultStore();
    writeStore(next);
    return next;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return normalizeStore(parsed);
  } catch {
    const backup = `${STORE_FILE}.broken-${Date.now()}`;
    fs.copyFileSync(STORE_FILE, backup);
    const next = createDefaultStore();
    writeStore(next);
    return next;
  }
}

function createDefaultStore() {
  const month = monthKey(new Date());
  const next = {
    schedules: { draft: {}, final: {} },
    workflow: {},
    board: seedBoard(month),
    availability: seedAvailability(month),
    staffProfiles: createDefaultStaffProfiles(),
    contentItems: seedContentItems(month),
    musicLibrary: seedMusicLibrary(),
    musicSchedule: {},
    businessDocuments: seedBusinessDocuments(month),
    shiftSlots,
    auditLog: [],
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  ensureMonth(next, month);
  next.musicSchedule[month] = seedMusicSchedule(month, next.musicLibrary);
  next.auditLog.push({
    id: crypto.randomUUID(),
    actorId: "system",
    actorName: "システム",
    action: "初期化",
    detail: "初期デモデータを作成しました。",
    createdAt: next.updatedAt,
  });
  return next;
}

function normalizeStore(value) {
  const legacySlots = isLegacyShiftSlots(value.shiftSlots);
  if (Array.isArray(value.shiftSlots) && value.shiftSlots.length && !legacySlots) {
    shiftSlots = value.shiftSlots;
  } else {
    shiftSlots = defaultShiftSlots.map((slot) => ({ ...slot }));
  }
  const defaultProfiles = createDefaultStaffProfiles();
  const next = {
    schedules: {
      draft: normalizeMonthScheduleMap(value.schedules?.draft || {}, legacySlots, null),
      final: normalizeMonthScheduleMap(value.schedules?.final || {}, legacySlots, value.schedules?.draft || {}),
    },
    workflow: value.workflow || {},
    board: normalizeSlotReferences(Array.isArray(value.board) ? value.board : []),
    availability: normalizeSlotReferences(Array.isArray(value.availability) ? value.availability : []),
    staffProfiles: { ...defaultProfiles, ...(value.staffProfiles || {}) },
    contentItems: Array.isArray(value.contentItems) ? value.contentItems : seedContentItems(monthKey(new Date())),
    musicLibrary: Array.isArray(value.musicLibrary) ? value.musicLibrary : seedMusicLibrary(),
    musicSchedule: value.musicSchedule || {},
    businessDocuments: Array.isArray(value.businessDocuments) ? value.businessDocuments : seedBusinessDocuments(monthKey(new Date())),
    shiftSlots,
    auditLog: Array.isArray(value.auditLog) ? value.auditLog : [],
    updatedAt: value.updatedAt || new Date().toISOString(),
    version: Number(value.version || 1),
  };
  ensureMonth(next, monthKey(new Date()));
  return next;
}

function isLegacyShiftSlots(slots) {
  if (!Array.isArray(slots) || !slots.length) return true;
  return slots.some((slot) => ["morning", "midday", "evening"].includes(slot.id));
}

function normalizeMonthScheduleMap(monthSchedules, legacySlots, draftSource) {
  const result = {};
  Object.keys(monthSchedules || {}).forEach((month) => {
    if (legacySlots || scheduleUsesLegacySlots(monthSchedules[month])) {
      result[month] = draftSource ? cloneSchedule(result[month] || generateMonthSchedule(month, null)) : generateMonthSchedule(month, null);
    } else {
      result[month] = cloneSchedule(monthSchedules[month]);
    }
  });
  return result;
}

function scheduleUsesLegacySlots(monthSchedule) {
  return Object.values(monthSchedule || {}).some((daySchedule) => {
    return Object.keys(daySchedule || {}).some((slotId) => ["morning", "midday", "evening"].includes(slotId));
  });
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

function saveAndBroadcast(shouldBroadcast) {
  store.updatedAt = new Date().toISOString();
  store.version += 1;
  writeStore(store);
  if (shouldBroadcast) broadcastUpdate();
}

function writeStore(next) {
  const tempFile = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(next, null, 2));
  fs.renameSync(tempFile, STORE_FILE);
}

function ensureMonth(targetStore, month) {
  const normalized = normalizeMonth(month);
  if (!targetStore.schedules.draft[normalized]) {
    targetStore.schedules.draft[normalized] = generateMonthSchedule(normalized, targetStore);
  }
  ensureScheduleSlots(targetStore.schedules.draft[normalized]);
  if (targetStore.schedules.final[normalized]) {
    ensureScheduleSlots(targetStore.schedules.final[normalized]);
  }
  if (!targetStore.workflow[normalized]) {
    targetStore.workflow[normalized] = {
      draftSharedAt: null,
      finalizedAt: null,
      draftDeadline: "",
      finalDeadline: "",
      monthlyNote: "",
    };
  } else {
    targetStore.workflow[normalized].draftDeadline ||= "";
    targetStore.workflow[normalized].finalDeadline ||= "";
    targetStore.workflow[normalized].monthlyNote ||= "";
  }
  if (!targetStore.musicSchedule) targetStore.musicSchedule = {};
  if (!targetStore.musicSchedule[normalized]) targetStore.musicSchedule[normalized] = {};
}

function generateMonthSchedule(month, targetStore = null) {
  const { year, monthIndex } = parseMonth(month);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const schedule = {};
  const assignmentCounts = new Map(staffMembers.map((staff) => [staff.id, 0]));

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    const iso = formatISO(date);
    schedule[iso] = {};

    shiftSlots.forEach((slot) => {
      const program = findOriginalProgram(date, getSlotHour(slot));
      const staffIds = program
        ? getOriginalProgramStaffIds(program)
        : pickAvailableStaffForSlot(date, slot, schedule[iso], assignmentCounts, targetStore);
      schedule[iso][slot.id] = staffIds;
      staffIds.forEach((staffId) => assignmentCounts.set(staffId, (assignmentCounts.get(staffId) || 0) + 1));
    });
  }

  return schedule;
}

function pickAvailableStaffForSlot(date, slot, daySchedule, assignmentCounts, targetStore) {
  const hour = getSlotHour(slot);
  const weekday = date.getDay();
  const iso = formatISO(date);
  const availableStaffIds = getMasterAvailableStaffIds(weekday, hour);
  const explicitAvailableIds = getAvailabilityItems(targetStore)
    .filter((item) => {
      return item.date === iso && item.type === "available" && (item.slot === "all" || item.slot === slot.id);
    })
    .map((item) => item.staffId);
  const pool = [...new Set([...explicitAvailableIds, ...availableStaffIds])].filter((staffId) => {
    return staffMembers.some((staff) => staff.id === staffId) && !hasOffConflict(staffId, iso, slot.id, targetStore);
  });
  const fallbackPool = staffMembers
    .map((staff) => staff.id)
    .filter((staffId) => !hasOffConflict(staffId, iso, slot.id, targetStore));
  const candidates = pool.length ? pool : fallbackPool;

  const chosen = candidates
    .map((staffId) => {
      const dayCount = countStaffInDay(daySchedule, staffId);
      const profilePenalty = staffProfileMentionsWeekday(staffId, weekday, targetStore) ? 20 : 0;
      const explicitBoost = explicitAvailableIds.includes(staffId) ? -8 : 0;
      const masterBoost = availableStaffIds.includes(staffId) ? -4 : 0;
      return {
        staffId,
        score: (assignmentCounts.get(staffId) || 0) * 10 + dayCount * 6 + profilePenalty + explicitBoost + masterBoost,
      };
    })
    .sort((a, b) => a.score - b.score || getStaffSortKey(a.staffId).localeCompare(getStaffSortKey(b.staffId)))[0];

  return chosen ? [chosen.staffId] : [];
}

function getMasterAvailableStaffIds(weekday, hour) {
  return (scheduleMasters.weeklyAvailability || [])
    .filter((item) => Number(item.weekday) === weekday && (item.hours || []).map(Number).includes(hour))
    .map((item) => codeToStaffId(item.staffCode))
    .filter(Boolean);
}

function getOriginalProgramStaffIds(program) {
  const orderedAbilities = ["P1", "MA", "P", "M", "A"];
  return orderedAbilities
    .map((ability) => program.assignments?.[ability])
    .filter(Boolean)
    .map(codeToStaffId)
    .filter(Boolean)
    .filter((staffId, index, array) => array.indexOf(staffId) === index)
    .slice(0, 2);
}

function findOriginalProgram(date, hour) {
  const weekday = date.getDay();
  const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
  return (scheduleMasters.originalPrograms || []).find((program) => {
    return Number(program.weekday) === weekday && Number(program.hour) === hour && matchesWeekRule(program.weekRule, weekNumber);
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
    .replace(/第/g, "第")
    .trim();
}

function codeToStaffId(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "";
  const staff = staffMembers.find((item) => item.code === normalized || item.id.toUpperCase() === normalized);
  return staff?.id || "";
}

function getSlotHour(slot) {
  const fromId = String(slot.id || "").match(/(\d{1,2})/);
  if (fromId) return Number(fromId[1]);
  const fromTime = String(slot.time || slot.label || "").match(/(\d{1,2})[:時]/);
  return fromTime ? Number(fromTime[1]) : 0;
}

function getAvailabilityItems(targetStore) {
  return Array.isArray(targetStore?.availability) ? targetStore.availability : [];
}

function hasOffConflict(staffId, date, slotId, targetStore) {
  return getAvailabilityItems(targetStore).some((item) => {
    return item.staffId === staffId && item.date === date && item.type === "off" && (item.slot === "all" || item.slot === slotId);
  });
}

function staffProfileMentionsWeekday(staffId, weekday, targetStore) {
  const note = targetStore?.staffProfiles?.[staffId]?.unavailableNote || "";
  return note ? mentionsWeekday(note, weekday) : false;
}

function countStaffInDay(daySchedule, staffId) {
  return Object.values(daySchedule || {}).reduce((count, staffIds) => {
    return count + (Array.isArray(staffIds) && staffIds.includes(staffId) ? 1 : 0);
  }, 0);
}

function getStaffSortKey(staffId) {
  return getStaff(staffId)?.code || staffId;
}

function mentionsWeekday(note, dayIndex) {
  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  const label = labels[dayIndex];
  return String(note || "").includes(`${label}曜`) || String(note || "").includes(label);
}

function seedBoard(month) {
  const fourth = `${month}-04`;
  const sixth = `${month}-06`;
  const tenth = `${month}-10`;

  return [
    {
      id: `seed-${month}-swap`,
      type: "swapConfirmed",
      date: fourth,
      slot: "hour_17",
      fromStaff: "aoki",
      toStaff: "madokawa",
      message: "青木 朋美さんの17時枠を窓川 唯良さんが代わります。窓川さんの承諾後、管理者承認へ進みます。",
      status: "pendingConsent",
      createdBy: "aoki",
      createdByName: "青木 朋美",
      createdAt: addMinutes(new Date(), -55).toISOString(),
      appliedAt: null,
      consentBy: null,
      consentAt: null,
      declinedBy: null,
      declinedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
    },
    {
      id: `seed-${month}-absence`,
      type: "absence",
      date: sixth,
      slot: "hour_12",
      fromStaff: "suyama",
      toStaff: "",
      message: "12時枠に入れなくなりました。交代できる方がいればお願いします。",
      status: "open",
      createdBy: "suyama",
      createdByName: "須山 成美",
      createdAt: addMinutes(new Date(), -35).toISOString(),
      appliedAt: null,
      consentBy: null,
      consentAt: null,
      declinedBy: null,
      declinedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
    },
    {
      id: `seed-${month}-notice`,
      type: "notice",
      date: tenth,
      slot: "hour_09",
      fromStaff: "sakamoto_yumiko",
      toStaff: "",
      message: "川崎区役所からの地域情報を朝の枠で必ず読み上げます。担当者は台本確認をお願いします。",
      status: "open",
      createdBy: "sakamoto_yumiko",
      createdByName: "坂本 由美子",
      createdAt: addMinutes(new Date(), -14).toISOString(),
      appliedAt: null,
      consentBy: null,
      consentAt: null,
      declinedBy: null,
      declinedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
    },
  ];
}

function seedAvailability(month) {
  return [
    {
      id: `seed-${month}-off-suyama`,
      staffId: "suyama",
      date: `${month}-06`,
      slot: "hour_12",
      type: "off",
      note: "昼ニュースは難しいため交代希望",
      createdAt: addMinutes(new Date(), -34).toISOString(),
      updatedAt: addMinutes(new Date(), -34).toISOString(),
      updatedBy: "suyama",
    },
    {
      id: `seed-${month}-available-shimizu`,
      staffId: "shimizu",
      date: `${month}-07`,
      slot: "all",
      type: "available",
      note: "終日対応可能",
      createdAt: addMinutes(new Date(), -22).toISOString(),
      updatedAt: addMinutes(new Date(), -22).toISOString(),
      updatedBy: "shimizu",
    },
  ];
}

function seedContentItems(month) {
  return [
    {
      id: `content-${month}-event`,
      date: `${month}-05`,
      program: "朝の情報枠",
      type: "script",
      title: "川崎区の週末イベント紹介",
      tags: ["川崎区", "イベント", "地域情報"],
      source: "写真: event-board-0605.jpg",
      body: "週末に川崎区内で行われる地域イベントを紹介。開催時間、会場、交通情報を短く整理して伝える。",
      transcript: "今週末は川崎区内で親子向けのイベントが複数予定されています。お出かけ前に交通情報も確認してください。",
      createdAt: addMinutes(new Date(), -90).toISOString(),
      createdBy: "shimizu",
      createdByName: "清水 暁",
      updatedAt: addMinutes(new Date(), -90).toISOString(),
      updatedBy: "shimizu",
      updatedByName: "清水 暁",
    },
    {
      id: `content-${month}-health`,
      date: `${month}-08`,
      program: "昼ニュース",
      type: "memo",
      title: "梅雨時期の体調管理",
      tags: ["健康", "梅雨", "生活情報"],
      source: "動画: health-rainy-season.mp4",
      body: "梅雨時期の睡眠、湿度、食中毒予防を扱う。医療断定は避け、行政や専門機関の情報確認を促す。",
      transcript: "",
      createdAt: addMinutes(new Date(), -70).toISOString(),
      createdBy: "suyama",
      createdByName: "須山 成美",
      updatedAt: addMinutes(new Date(), -70).toISOString(),
      updatedBy: "suyama",
      updatedByName: "須山 成美",
    },
    {
      id: `content-${month}-duplicate-demo`,
      date: `${month}-12`,
      program: "夕方番組",
      type: "transcript",
      title: "川崎区の週末イベント振り返り",
      tags: ["川崎区", "イベント"],
      source: "文字起こし",
      body: "",
      transcript: "川崎区内で週末に行われた地域イベントを振り返り、会場の様子や交通情報について紹介しました。",
      createdAt: addMinutes(new Date(), -45).toISOString(),
      createdBy: "aoki",
      createdByName: "青木 朋美",
      updatedAt: addMinutes(new Date(), -45).toISOString(),
      updatedBy: "aoki",
      updatedByName: "青木 朋美",
    },
  ];
}

function seedBusinessDocuments(month) {
  return [
    {
      id: `doc-${month}-estimate`,
      type: "estimate",
      issueDate: `${month}-03`,
      dueDate: `${month}-17`,
      client: "川崎区イベント実行委員会",
      contact: "ご担当者様",
      title: "地域イベント告知枠 制作・放送",
      amount: 88000,
      status: "sent",
      fileRef: "見積書_地域イベント告知枠_20260603.pdf",
      memo: "送付文コピーでメール下書きを作成。正式送信はメールソフトから行う想定。",
      sentAt: addMinutes(new Date(), -180).toISOString(),
      paidAt: null,
      createdAt: addMinutes(new Date(), -190).toISOString(),
      createdBy: "shimizu",
      createdByName: "清水 暁",
      updatedAt: addMinutes(new Date(), -180).toISOString(),
      updatedBy: "shimizu",
      updatedByName: "清水 暁",
    },
    {
      id: `doc-${month}-delivery`,
      type: "delivery",
      issueDate: `${month}-06`,
      dueDate: "",
      client: "大師商店街連合会",
      contact: "広報担当者様",
      title: "商店街キャンペーン収録データ納品",
      amount: 0,
      status: "ready",
      fileRef: "納品書_商店街キャンペーン_20260606.pdf",
      memo: "音声データと一緒に送付予定。",
      sentAt: null,
      paidAt: null,
      createdAt: addMinutes(new Date(), -150).toISOString(),
      createdBy: "suyama",
      createdByName: "須山 成美",
      updatedAt: addMinutes(new Date(), -150).toISOString(),
      updatedBy: "suyama",
      updatedByName: "須山 成美",
    },
    {
      id: `doc-${month}-invoice`,
      type: "invoice",
      issueDate: `${month}-10`,
      dueDate: `${month}-30`,
      client: "川崎大師周辺店舗",
      contact: "代表者様",
      title: "6月広告放送枠",
      amount: 132000,
      status: "draft",
      fileRef: "請求書_6月広告放送枠_20260610.pdf",
      memo: "内容確認後に送付。",
      sentAt: null,
      paidAt: null,
      createdAt: addMinutes(new Date(), -120).toISOString(),
      createdBy: "shimizu",
      createdByName: "清水 暁",
      updatedAt: addMinutes(new Date(), -120).toISOString(),
      updatedBy: "shimizu",
      updatedByName: "清水 暁",
    },
  ];
}

function seedMusicLibrary() {
  const tracks = [
    ["A-001", "1", "初夏の風通り", "FM大師ライブラリ", "ポップス", "初夏", "爽やか", "初夏,朝,晴れ"],
    ["A-001", "2", "雨上がりの参道", "FM大師ライブラリ", "インスト", "梅雨", "落ち着く", "雨,川崎大師,散歩"],
    ["A-001", "3", "花束の約束", "FM大師ライブラリ", "バラード", "通年", "温かい", "結婚式,ジューンブライド"],
    ["A-002", "1", "海辺のニュース", "FM大師ライブラリ", "ポップス", "夏", "明るい", "夏,海,昼"],
    ["A-002", "2", "祭り囃子の帰り道", "FM大師ライブラリ", "和風", "夏", "にぎやか", "祭り,夕方"],
    ["A-002", "3", "八月の青空", "FM大師ライブラリ", "ポップス", "夏", "爽快", "夏,青空"],
    ["A-003", "1", "秋風の手紙", "FM大師ライブラリ", "バラード", "秋", "穏やか", "秋,始まり"],
    ["A-003", "2", "読書灯", "FM大師ライブラリ", "ジャズ", "秋", "落ち着く", "秋,夜"],
    ["A-003", "3", "金木犀の駅前", "FM大師ライブラリ", "ポップス", "秋", "懐かしい", "秋,散歩"],
    ["A-004", "1", "冬の商店街", "FM大師ライブラリ", "ポップス", "冬", "温かい", "冬,年末"],
    ["A-004", "2", "白い息の朝", "FM大師ライブラリ", "インスト", "冬", "静か", "冬,朝"],
    ["A-004", "3", "新しい年へ", "FM大師ライブラリ", "ポップス", "冬", "前向き", "新年,希望"],
    ["B-001", "1", "春待ちラジオ", "FM大師ライブラリ", "ポップス", "春", "明るい", "春,新生活"],
    ["B-001", "2", "桜色の交差点", "FM大師ライブラリ", "バラード", "春", "やさしい", "春,桜"],
    ["B-001", "3", "旅立ちのホーム", "FM大師ライブラリ", "ポップス", "春", "前向き", "卒業,旅立ち"],
    ["B-002", "1", "昼下がりのジャズ", "FM大師ライブラリ", "ジャズ", "通年", "落ち着く", "昼,カフェ"],
    ["B-002", "2", "ニュース前の一曲", "FM大師ライブラリ", "インスト", "通年", "端正", "ニュース,短尺"],
    ["B-002", "3", "夕暮れブリッジ", "FM大師ライブラリ", "ポップス", "通年", "穏やか", "夕方,川崎"],
    ["C-001", "1", "雨音ワルツ", "FM大師ライブラリ", "ジャズ", "梅雨", "落ち着く", "雨,夜"],
    ["C-001", "2", "指輪のメロディ", "FM大師ライブラリ", "バラード", "通年", "華やか", "結婚式,ジューンブライド"],
    ["C-001", "3", "チャペルの朝", "FM大師ライブラリ", "クラシック", "通年", "清らか", "結婚式,朝"],
    ["C-002", "1", "ひまわり通り", "FM大師ライブラリ", "ポップス", "夏", "元気", "夏,家族"],
    ["C-002", "2", "夕立のあとで", "FM大師ライブラリ", "バラード", "夏", "涼しい", "夏,雨"],
    ["C-002", "3", "波音ステーション", "FM大師ライブラリ", "インスト", "夏", "爽やか", "海,夏"],
    ["D-001", "1", "小さな灯り", "FM大師ライブラリ", "バラード", "秋", "温かい", "秋,家族"],
    ["D-001", "2", "九月の始発", "FM大師ライブラリ", "ポップス", "秋", "前向き", "秋,始まり"],
    ["D-001", "3", "夜長のリズム", "FM大師ライブラリ", "ジャズ", "秋", "落ち着く", "秋,夜"],
    ["D-002", "1", "商店街サンバ", "FM大師ライブラリ", "ラテン", "夏", "にぎやか", "祭り,商店街"],
    ["D-002", "2", "多摩川サンセット", "FM大師ライブラリ", "インスト", "通年", "穏やか", "夕方,川崎"],
    ["D-002", "3", "地域ニュースのテーマ", "FM大師ライブラリ", "インスト", "通年", "端正", "ニュース,短尺"],
    ["E-001", "1", "家族写真", "FM大師ライブラリ", "バラード", "通年", "温かい", "家族,結婚式"],
    ["E-001", "2", "六月の招待状", "FM大師ライブラリ", "ポップス", "初夏", "華やか", "ジューンブライド,結婚式"],
    ["E-001", "3", "雨傘のデュエット", "FM大師ライブラリ", "ポップス", "梅雨", "やさしい", "雨,初夏"],
    ["E-002", "1", "朝市の足音", "FM大師ライブラリ", "ポップス", "通年", "明るい", "朝,地域"],
    ["E-002", "2", "町角インタビュー", "FM大師ライブラリ", "インスト", "通年", "軽快", "トーク,短尺"],
    ["E-002", "3", "お便り日和", "FM大師ライブラリ", "ポップス", "通年", "やさしい", "リスナー,昼"],
  ];

  return tracks.map(([cdCode, trackNo, title, artist, genre, season, mood, themes]) => ({
    id: `track-${cdCode.toLowerCase().replaceAll("-", "")}-${trackNo}`,
    cdCode,
    shelf: cdCode.slice(0, 1),
    trackNo,
    title,
    artist,
    genre,
    season,
    mood,
    themes: normalizeTextList(themes),
    notes: "デモ用の仮登録です。実CD台帳に差し替えてください。",
    createdAt: addMinutes(new Date(), -120).toISOString(),
    createdBy: "system",
    updatedAt: addMinutes(new Date(), -120).toISOString(),
    updatedBy: "system",
  }));
}

function seedMusicSchedule(month, musicLibrary) {
  const result = {};
  const dates = [`${month}-05`, `${month}-06`, `${month}-07`];
  dates.forEach((date, index) => {
    const trackIds = musicLibrary.slice(index * 10, index * 10 + 30).map((track) => track.id);
    result[date] = {
      date,
      theme: index === 0 ? inferSeasonTheme(date) : "地域情報に合う明るい選曲",
      count: trackIds.length,
      trackIds,
      generatedAt: addMinutes(new Date(), -60 + index * 5).toISOString(),
      generatedBy: "system",
    };
  });
  return result;
}

function createDefaultStaffProfiles() {
  return Object.fromEntries(
    staffMembers.map((staff) => [
      staff.id,
      {
        staffId: staff.id,
        contact: "",
        skills: `${staff.code} / ${(staff.abilities || []).join("・") || "P"}`,
        unavailableNote: "",
        updatedAt: null,
        updatedBy: null,
      },
    ]),
  );
}

function addAudit(user, action, detail) {
  store.auditLog.unshift({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
  store.auditLog = store.auditLog.slice(0, 120);
}

async function serveStatic(res, requestedPath) {
  const cleanPath = requestedPath === "/" ? "/index.html" : decodeURIComponent(requestedPath);
  const filePath = path.normalize(path.join(ROOT_DIR, cleanPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=60",
  });
  fs.createReadStream(filePath).pipe(res);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function requireSession(req, url) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : url.searchParams.get("token");
  return sessions.get(token);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function publicUser(user) {
  const { pin, ...safeUser } = user;
  return safeUser;
}

function isAdmin(user) {
  return user.permission === "admin";
}

function getRequestedMonth(url) {
  return normalizeMonth(url.searchParams.get("month") || monthKey(new Date()));
}

function normalizeMonth(month) {
  return /^\d{4}-\d{2}$/.test(String(month)) ? String(month) : monthKey(new Date());
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const parsed = parseISO(value);
  return formatISO(parsed) === value;
}

function buildPostAuditText(post) {
  const slot = getSlot(post.slot);
  const from = getStaff(post.fromStaff);
  const to = getStaff(post.toStaff);
  if (post.type === "swapConfirmed") {
    return `${formatDateShort(post.date)} ${slot.label}: ${from.name}さんから${to.name}さんへの交換`;
  }
  if (post.type === "absence") {
    return `${formatDateShort(post.date)} ${slot.label}: ${from.name}さんの欠勤連絡`;
  }
  return `${formatDateShort(post.date)} ${slot.label}: ${post.message}`;
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

function createSystemPost(month, type, message, user) {
  return {
    id: crypto.randomUUID(),
    type,
    date: `${month}-01`,
    slot: "hour_09",
    fromStaff: user.staffId || "shimizu",
    toStaff: "",
    message,
    status: "open",
    createdBy: user.id,
    createdByName: user.name,
    createdAt: new Date().toISOString(),
    appliedAt: null,
    consentBy: null,
    consentAt: null,
    declinedBy: null,
    declinedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
  };
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
  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdayLabels[date.getDay()]}）`;
}

function formatMonthLabel(month) {
  const { year, monthIndex } = parseMonth(month);
  return `${year}年${monthIndex + 1}月`;
}

function addMinutes(date, amount) {
  const next = new Date(date);
  next.setMinutes(date.getMinutes() + amount);
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

function cloneSchedule(schedule) {
  return JSON.parse(JSON.stringify(schedule || {}));
}
