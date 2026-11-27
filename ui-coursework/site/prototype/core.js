/* ==========================================================
   core.js —— 状态、壳层、路由、反馈组件
   ========================================================== */

const PAGES = {};

const state = {
  page: "home",
  loggedIn: true,
  loading: true,
  term: "2025-2026-2",
  week: 12,
  day: 5,
  scheduleMode: "day",
  gradeFilter: "all",
  courseTab: "available",
  courseType: "all",
  courseQuery: "",
  selected: ["c-ml", "c-innov"],
  courseCredits: DB.credits.selected,
  examMode: "list",
  todos: DB.todos.map((item) => ({ ...item })),
  flags: { empty: {}, error: {} },
  sessionExpired: false,
  loginError: "",
  loginId: "",
  loginPwd: "",
  loginLoading: false,
  notify: true,
  focusSearch: false,
};

const TABS = [
  { key: "home", label: "今日", icon: "home" },
  { key: "schedule", label: "课表", icon: "calendar" },
  { key: "grades", label: "成绩", icon: "chart" },
  { key: "courses", label: "选课", icon: "book" },
  { key: "profile", label: "我的", icon: "user" },
];

const els = {};
let loadTimer = null;
let toastTimer = null;

/* ---------- 工具 ---------- */
function ic(name, cls = "ic") {
  return '<svg class="' + cls + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toneClass(tone) {
  return "tone-" + (tone || "blue");
}

function daysUntil(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function countdownParts(iso) {
  const diff = Math.max(0, new Date(iso).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}

/* ---------- 壳层 ---------- */
function tabbarHTML() {
  return TABS.map((tab) => {
    const active = tab.key === state.page;
    return (
      '<button type="button" class="tabbar__item' + (active ? " is-active" : "") + '"' +
      ' data-action="nav" data-page="' + tab.key + '"' +
      (active ? ' aria-current="page"' : "") + ">" +
      ic(tab.icon) +
      "<span>" + tab.label + "</span></button>"
    );
  }).join("");
}

function pageBarHTML() {
  if (!state.loggedIn) return "";
  const def = PAGES[state.page];
  return def && def.bar ? def.bar() : "";
}

function skeletonHTML(page) {
  if (page === "home") {
    return '<div class="sk sk-hero"></div>' +
      '<div class="sk" style="height:18px;width:40%;margin:0 4px 10px"></div>' +
      '<div class="sk sk-card"></div>' +
      '<div class="sk" style="height:18px;width:30%;margin:18px 4px 10px"></div>' +
      '<div class="sk sk-card" style="height:72px"></div>' +
      '<div class="sk sk-card" style="height:72px"></div>';
  }
  if (page === "grades") {
    return '<div class="sk sk-card" style="height:150px"></div>' +
      '<div class="sk" style="height:16px;width:36%;margin:20px 4px 12px"></div>' +
      '<div class="sk sk-card" style="height:240px"></div>';
  }
  if (page === "profile") {
    return '<div class="sk sk-card" style="height:110px"></div>' +
      '<div class="sk" style="height:16px;width:32%;margin:20px 4px 12px"></div>' +
      '<div class="sk sk-card" style="height:230px"></div>';
  }
  return '<div class="sk sk-card" style="height:110px"></div>' +
    '<div class="sk" style="height:16px;width:34%;margin:20px 4px 12px"></div>' +
    '<div class="sk sk-card" style="height:300px"></div>';
}

function errorBodyHTML() {
  return '<div class="page-head"><span class="eyebrow">状态演示 · 网络错误</span>' +
    '<h1 class="page-title">这一页没加载出来</h1></div>' +
    '<div class="card state-card">' +
    '<div class="state-icon state-icon--danger">' + ic("wifi-off", "ic ic-28") + "</div>" +
    '<div class="state-title">网络开小差了</div>' +
    '<p class="state-desc">请求没有到达教务服务。可能是当前网络不稳定，也可能是选课高峰导致服务繁忙。你可以重试，或稍后再来。</p>' +
    '<div class="state-actions">' +
    '<button class="btn btn--primary btn--sm" data-action="retry">' + ic("refresh", "ic ic-16") + "重试</button>" +
    '<button class="btn btn--secondary btn--sm" data-action="help">' + ic("help", "ic ic-16") + "获取帮助</button>" +
    "</div></div>";
}

function emptyBodyHTML(title, desc, action) {
  return '<div class="page-head"><span class="eyebrow">状态演示 · 空状态</span>' +
    '<h1 class="page-title">' + title + "</h1></div>" +
    '<div class="card state-card">' +
    '<div class="state-icon state-icon--brand">' + ic("clipboard", "ic ic-28") + "</div>" +
    '<div class="state-title">暂时没有内容</div>' +
    '<p class="state-desc">' + desc + "</p>" +
    '<div class="state-actions">' +
    '<button class="btn btn--secondary btn--sm" data-action="refresh">' + ic("refresh", "ic ic-16") + "刷新</button>" +
    (action || "") +
    "</div></div>";
}

function renderView() {
  if (!state.loggedIn) {
    els.appbar.style.display = "none";
    els.tabbar.style.display = "none";
    els.view.innerHTML = '<div class="page">' + pageLogin().body + "</div>";
    return;
  }

  els.appbar.style.display = "";
  els.tabbar.style.display = "";
  els.appbar.innerHTML = pageBarHTML();

  let body;
  if (state.loading) {
    body = skeletonHTML(state.page);
  } else if (state.flags.error[state.page]) {
    body = errorBodyHTML();
  } else if (state.flags.empty[state.page]) {
    body = emptyBodyHTML(
      "这里先空着",
      "这个页面当前没有可展示的数据。空状态也会告诉用户发生了什么，而不是留白。",
      '<button class="btn btn--ghost btn--sm" data-action="clear-demo">恢复正常</button>'
    );
  } else {
    body = PAGES[state.page] ? PAGES[state.page].body() : "";
  }

  const prevScroll = els.view.scrollTop;
  els.view.innerHTML = '<div class="page">' + body + "</div>";
  els.tabbar.innerHTML = tabbarHTML();
  els.view.scrollTop = state._resetScroll ? 0 : prevScroll;
  state._resetScroll = false;

  if (state.focusSearch) {
    state.focusSearch = false;
    const input = els.view.querySelector('[data-role="course-search"]');
    if (input) {
      input.focus();
      const len = input.value.length;
      try { input.setSelectionRange(len, len); } catch (e) { /* noop */ }
    }
  }
}

function renderAll() {
  renderView();
}

/* ---------- 路由 ---------- */
function navTo(page, options) {
  if (!state.loggedIn) return;
  const opts = options || {};
  if (page === state.page && !opts.force) {
    els.view.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  state.page = page;
  state.flags.error[page] = false;
  state.flags.empty[page] = false;
  state.loading = true;
  state._resetScroll = true;
  renderView();

  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    state.loading = false;
    renderView();
  }, opts.delay || 480);
}

function refreshCurrentPage(delay) {
  state.loading = true;
  state.flags.error[state.page] = false;
  renderView();
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    state.loading = false;
    renderView();
  }, delay || 520);
}

/* ---------- 浮层 / Toast ---------- */
function openLayer(html) {
  if (els.layer) els.layer.innerHTML = html;
}

function closeLayer() {
  if (els.layer) els.layer.innerHTML = "";
}

function isLayerOpen() {
  return !!(els.layer && els.layer.children.length);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-show"), 2400);
}

/* ---------- 会话过期 ---------- */
function openSessionModal() {
  state.sessionExpired = true;
  openLayer(
    '<div class="overlay overlay--center" data-close="1">' +
    '<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-title">' +
    '<div class="dialog__icon state-icon--danger">' + ic("lock", "ic ic-28") + "</div>" +
    '<div class="dialog__title" id="session-title">登录状态已过期</div>' +
    '<p class="dialog__desc">为了保护你的信息，本次登录已结束。重新登录后会回到<strong>当前页面</strong>，周次、学期和筛选条件都会保留。</p>' +
    '<div class="badge badge--danger" style="margin-top:12px">剩余免登录 04:58</div>' +
    '<div class="dialog__actions">' +
    '<button class="btn btn--secondary" data-action="session-login">一键重新登录</button>' +
    '<button class="btn btn--primary" data-action="session-back">回登录页</button>' +
    "</div></div></div>"
  );
}

function restoreSession() {
  closeLayer();
  state.sessionExpired = false;
  const page = state.page;
  const term = state.term;
  state.loading = true;
  state.loggedIn = true;
  state.page = page;
  state.term = term;
  renderAll();
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    state.loading = false;
    renderAll();
    toast("会话已恢复，回到「" + pageLabel(page) + "」");
  }, 650);
}

function pageLabel(page) {
  const found = TABS.find((tab) => tab.key === page);
  if (found) return found.label;
  if (page === "exam") return "考试";
  return "当前页";
}

/* ---------- 事件 ---------- */
function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isLayerOpen()) closeLayer();
    if ((event.key === "Enter" || event.key === " ") &&
        event.target.matches('[role="button"][data-action]')) {
      event.preventDefault();
      event.target.click();
    }
  });
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    const closer = event.target.closest("[data-close]");
    if (closer && event.target === closer) closeLayer();
    return;
  }
  const action = target.getAttribute("data-action");

  switch (action) {
    case "nav":
      navTo(target.getAttribute("data-page"));
      break;

    case "back":
      navTo("home");
      break;

    case "retry":
      refreshCurrentPage(650);
      break;

    case "refresh":
      refreshCurrentPage(600);
      break;

    case "help":
      toast("已为你打开帮助中心（原型演示）");
      break;

    case "clear-demo":
      state.flags.empty[state.page] = false;
      state.flags.error[state.page] = false;
      renderView();
      break;

    case "week-prev":
      state.week = Math.max(1, state.week - 1);
      refreshCurrentPage(380);
      break;

    case "week-next":
      state.week = Math.min(DB.term.totalWeeks, state.week + 1);
      refreshCurrentPage(380);
      break;

    case "week-now":
      state.week = DB.term.week;
      state.day = DB.term.todayIndex;
      refreshCurrentPage(380);
      break;

    case "pick-day":
      state.day = Number(target.getAttribute("data-day"));
      renderView();
      break;

    case "schedule-mode":
      state.scheduleMode = target.getAttribute("data-mode");
      renderView();
      break;

    case "open-course":
      openCourseDetail(target.getAttribute("data-id"));
      break;

    case "pick-term":
      state.term = target.getAttribute("data-term");
      refreshCurrentPage(520);
      break;

    case "grade-filter":
      state.gradeFilter = target.getAttribute("data-filter");
      renderView();
      break;

    case "grade-detail":
      openGradeDetail(target.getAttribute("data-id"));
      break;

    case "toggle-todo": {
      const id = target.getAttribute("data-id");
      const todo = state.todos.find((item) => item.id === id);
      if (todo) todo.done = !todo.done;
      renderView();
      break;
    }

    case "course-tab":
      state.courseTab = target.getAttribute("data-tab");
      state.courseType = "all";
      state.courseQuery = "";
      renderView();
      break;

    case "course-type":
      state.courseType = target.getAttribute("data-type");
      renderView();
      break;

    case "enroll":
      startEnroll(target.getAttribute("data-id"));
      break;

    case "withdraw":
      confirmWithdraw(target.getAttribute("data-id"));
      break;

    case "queue-cancel":
      cancelQueue();
      break;

    case "queue-retry":
      closeLayer();
      startEnroll(target.getAttribute("data-id"));
      break;

    case "do-withdraw":
      doWithdraw(target.getAttribute("data-id"));
      break;

    case "exam-mode":
      state.examMode = target.getAttribute("data-mode");
      renderView();
      break;

    case "exam-day":
      toast(target.getAttribute("data-label") + " 有考试安排");
      break;

    case "toggle-notify":
      state.notify = !state.notify;
      renderView();
      toast(state.notify ? "已开启消息通知" : "已关闭消息通知");
      break;

    case "session-expire":
      openSessionModal();
      break;

    case "session-login":
      restoreSession();
      break;

    case "session-back":
      closeLayer();
      state.loggedIn = false;
      state.sessionExpired = false;
      renderAll();
      break;

    case "logout":
      openLayer(
        '<div class="overlay overlay--center" data-close="1">' +
        '<div class="dialog" role="dialog" aria-modal="true">' +
        '<div class="dialog__icon state-icon--danger">' + ic("logout", "ic ic-28") + "</div>" +
        '<div class="dialog__title">退出登录？</div>' +
        '<p class="dialog__desc">退出后将回到统一身份认证页，再次进入需要重新登录。</p>' +
        '<div class="dialog__actions">' +
        '<button class="btn btn--secondary" data-action="close-layer">取消</button>' +
        '<button class="btn btn--danger" data-action="do-logout">退出登录</button>' +
        "</div></div></div>"
      );
      break;

    case "do-logout":
      closeLayer();
      state.loggedIn = false;
      state.loginError = "";
      state.loginId = "";
      state.loginPwd = "";
      renderAll();
      break;

    case "login":
      submitLogin();
      break;

    case "demo-state":
      applyDemoState(target.getAttribute("data-state"));
      break;

    case "close-layer":
      closeLayer();
      break;

    case "about":
      openLayer(
        '<div class="overlay" data-close="1"><div class="sheet" role="dialog" aria-modal="true">' +
        '<div class="sheet__grip"></div>' +
        '<div class="sheet__title">关于这个作品</div>' +
        '<p class="sheet__sub">「南邮教务 · 体验重设计」是《UI 及交互设计（实验课）》课程作业，基于真实教务系统的体验走查做概念重设计，不冒充官方系统，也不代表南京邮电大学。</p>' +
        '<div class="divider"></div>' +
        '<dl class="kv"><dt>研究样本</dt><dd>问卷 N=68 · 访谈 5 人</dd></dl>' +
        '<dl class="kv"><dt>数据性质</dt><dd>课程作业示意数据</dd></dl>' +
        '<dl class="kv"><dt>设计范围</dt><dd>移动端 · 6 个核心页面</dd></dl>' +
        '<dl class="kv"><dt>版本</dt><dd>原型 v1.0</dd></dl>' +
        '<button class="btn btn--secondary btn--block" style="margin-top:18px" data-action="close-layer">我知道了</button>' +
        "</div></div>"
      );
      break;

    case "view-home":
      state.flags.empty[state.page] = false;
      state.flags.error[state.page] = false;
      renderView();
      break;

    case "go-grade":
      navTo("grades");
      break;

    case "go-exam":
      navTo("exam");
      break;

    case "go-courses":
      navTo("courses");
      break;

    case "go-schedule":
      navTo("schedule");
      break;

    case "open-eval":
      toast("评教任务已打开（原型演示）");
      break;

    case "notify":
      toast("暂无新通知");
      break;

    default:
      break;
  }

  if (target.getAttribute("data-close") === "1" && event.target === target) {
    closeLayer();
  }
}

function handleInput(event) {
  const role = event.target.getAttribute("data-role");
  if (role === "course-search") {
    state.courseQuery = event.target.value;
    state.focusSearch = true;
    renderView();
  }
  if (role === "login-id") state.loginId = event.target.value;
  if (role === "login-pwd") state.loginPwd = event.target.value;
}

/* ---------- 登录 / 退课 / 演示状态 ---------- */
function submitLogin() {
  if (state.loginLoading) return;
  const id = state.loginId.trim();
  const password = state.loginPwd.trim();
  if (!id || !password) {
    state.loginError = "请输入学号和密码";
    renderAll();
    return;
  }
  state.loginLoading = true;
  state.loginError = "";
  renderAll();

  API.login({ id, password })
    .then(() => {
      state.loginLoading = false;
      state.loggedIn = true;
      state.page = "home";
      state.loading = true;
      renderAll();
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        state.loading = false;
        renderAll();
        toast("登录成功，已回到「今日」");
      }, 650);
    })
    .catch((error) => {
      state.loginLoading = false;
      state.loginError = error.message || "登录失败，请重试";
      renderAll();
    });
}

function doWithdraw(courseId) {
  closeLayer();
  const course = allCourses().find((item) => item.id === courseId);
  API.withdraw(courseId).then(() => {
    state.selected = state.selected.filter((id) => id !== courseId);
    if (course) {
      course.enrolled = Math.max(0, course.enrolled - 1);
      state.courseCredits = Math.round((state.courseCredits - course.credit) * 10) / 10;
    }
    renderAll();
    toast("已退课" + (course ? "：" + course.name : ""));
  });
}

function applyDemoState(kind) {
  if (kind === "session") {
    openSessionModal();
    return;
  }

  if (kind === "queue") {
    navTo("courses", { delay: 420 });
    setTimeout(() => {
      startEnroll("c-algo2");
    }, 640);
    return;
  }

  const page = state.page;
  state.flags.empty[page] = false;
  state.flags.error[page] = false;

  if (kind === "loading") {
    state.loading = true;
    renderView();
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      state.loading = false;
      renderView();
    }, 2800);
    return;
  }
  if (kind === "empty") {
    state.flags.empty[page] = true;
    renderView();
    toast("已切换到空状态");
    return;
  }
  if (kind === "error") {
    state.flags.error[page] = true;
    renderView();
    toast("已模拟网络错误");
  }
}

/* ---------- 初始化 ---------- */
function init() {
  els.appbar = document.getElementById("appbar");
  els.view = document.getElementById("view");
  els.tabbar = document.getElementById("tabbar");
  els.layer = document.getElementById("layer");
  els.toast = document.getElementById("toast");

  bindEvents();
  renderAll();

  loadTimer = setTimeout(() => {
    state.loading = false;
    renderAll();
  }, 780);
}

document.addEventListener("DOMContentLoaded", init);
