/* ==========================================================
   page-courses.js —— P-04 选课（含冲突、排队、失败重试）
   ========================================================== */

let queueTimer = null;
let queueActive = false;

function allCourses() {
  return [...DB.courses.available, ...DB.courses.selected];
}

function isSelected(id) {
  return state.selected.indexOf(id) > -1;
}

function selectedCourses() {
  return allCourses().filter((course) => isSelected(course.id));
}

function availableCourses() {
  return allCourses().filter((course) => !isSelected(course.id));
}

PAGES.courses = {
  bar() {
    return (
      '<div class="appbar__title">选课<div class="appbar__sub">' +
      "已选 " + state.courseCredits + " / " + DB.credits.limit + " 学分</div></div>" +
      '<div class="appbar__spacer"></div>' +
      '<button class="icon-btn" data-action="help" aria-label="选课帮助">' + ic("help") + "</button>"
    );
  },

  body() {
    const available = availableCourses();
    const selected = selectedCourses();
    const percent = Math.min(100, Math.round((state.courseCredits / DB.credits.limit) * 100));

    const typeChips = ["all", "必修", "选修", "通识"].map((type) =>
      '<button class="chip' + (state.courseType === type ? " is-active" : "") + '"' +
      ' data-action="course-type" data-type="' + type + '">' + (type === "all" ? "全部" : type) + "</button>"
    ).join("");

    const filtered = available.filter((course) => {
      const matchType = state.courseType === "all" || course.type === state.courseType;
      const query = state.courseQuery.trim();
      const matchQuery = !query || course.name.indexOf(query) > -1 || course.teacher.indexOf(query) > -1;
      return matchType && matchQuery;
    });

    const availableList = filtered.length
      ? filtered.map((course) => this.courseRow(course, "available")).join("")
      : '<div class="card state-card" style="padding:26px 16px">' +
        '<div class="state-title" style="font-size:14px">没有匹配的课程</div>' +
        '<p class="state-desc">换个关键词或筛选条件试试。</p>' +
        '<div class="state-actions"><button class="btn btn--secondary btn--sm" data-action="course-type" data-type="all">清空筛选</button></div>' +
        "</div>";

    const selectedList = selected.length
      ? selected.map((course) => this.courseRow(course, "selected")).join("")
      : '<div class="card state-card" style="padding:26px 16px">' +
        '<div class="state-title" style="font-size:14px">还没有选任何课</div>' +
        '<p class="state-desc">去「可选课程」挑一门吧。</p>' +
        '<div class="state-actions"><button class="btn btn--secondary btn--sm" data-action="course-tab" data-tab="available">去选课</button></div>' +
        "</div>";

    return (
      '<div class="page-head">' +
      '<span class="eyebrow">选课中心 · 第 ' + DB.term.week + " 周</span>" +
      '<h1 class="page-title">选课</h1>' +
      '<p class="page-sub">冲突会在选课前校验，高峰时段自动排队并给出预计等待时间。</p>' +
      "</div>" +

      '<div class="card credit-card">' +
      '<div class="credit-top"><div><div class="small muted">本轮已选学分</div>' +
      '<div class="credit-num" style="margin-top:4px">' + state.courseCredits + '<small>/ ' + DB.credits.limit + "</small></div></div>" +
      '<span class="badge badge--brand">' + percent + "%</span></div>" +
      '<div class="progress" style="margin-top:12px"><div class="progress__bar" style="width:' + percent + '%"></div></div>' +
      '<div class="credit-facts"><span>已修 <b>' + DB.credits.earned + "</b> / " + DB.credits.required + " 学分</span>" +
      "<span>已选 <b>" + selected.length + "</b> 门课</span>" +
      "<span>上限 <b>" + DB.credits.limit + "</b> 学分</span></div>" +
      "</div>" +

      '<div class="segmented segmented--block" style="margin:16px 0 14px" role="tablist" aria-label="选课视图">' +
      '<button data-action="course-tab" data-tab="available" role="tab"' +
      (state.courseTab === "available" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">可选课程</button>" +
      '<button data-action="course-tab" data-tab="selected" role="tab"' +
      (state.courseTab === "selected" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">已选课程（" + selected.length + "）</button>" +
      "</div>" +

      (state.courseTab === "available"
        ? '<div class="input-wrap" style="margin-bottom:12px">' + ic("search", "ic ic-18") +
          '<input class="input" type="search" data-role="course-search" placeholder="搜索课程或教师" value="' + esc(state.courseQuery) + '" aria-label="搜索课程或教师" />' +
          "</div>" +
          '<div class="chips" style="margin-bottom:12px">' + typeChips + "</div>" +
          '<div class="card" style="padding-top:2px;padding-bottom:6px">' + availableList + "</div>"
        : '<div class="card" style="padding-top:2px;padding-bottom:6px">' + selectedList + "</div>") +

      '<p class="disclaimer">选课结果以教务系统正式记录为准。<br>高并发时会显示排队位次与预计时间，取消排队不产生选课记录。</p>'
    );
  },

  courseRow(course, mode) {
    const full = course.enrolled >= course.capacity;
    const percent = Math.min(100, Math.round((course.enrolled / course.capacity) * 100));
    const conflict = !!course.conflict;

    let action;
    if (mode === "selected") {
      action = '<button class="btn btn--ghost btn--sm" data-action="withdraw" data-id="' + course.id + '">退课</button>';
    } else if (full) {
      action = '<button class="btn btn--sm is-disabled" disabled>名额已满</button>';
    } else if (conflict) {
      action = '<button class="btn btn--secondary btn--sm" data-action="enroll" data-id="' + course.id + '">查看冲突</button>';
    } else {
      action = '<button class="btn btn--primary btn--sm" data-action="enroll" data-id="' + course.id + '">选课</button>';
    }

    return (
      '<div class="course-item">' +
      '<div class="course-item__top"><div style="flex:1;min-width:0">' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><span class="course-item__name">' + esc(course.name) + "</span>" +
      (conflict ? '<span class="badge badge--warn">时间冲突</span>' : "") +
      (full ? '<span class="badge badge--danger">已满</span>' : "") +
      "</div>" +
      '<div class="course-item__meta">' +
      "<span>" + ic("user", "ic ic-16") + esc(course.teacher) + "</span>" +
      "<span>" + ic("clock", "ic ic-16") + esc(course.time) + "</span>" +
      "<span>" + ic("pin", "ic ic-16") + esc(course.room) + "</span>" +
      "<span>" + course.credit.toFixed(1) + " 学分 · " + esc(course.type) + "</span>" +
      "</div></div></div>" +
      '<div class="course-item__bottom">' +
      '<div class="capacity ' + (full ? "capacity--full" : "") + '"><b>' + course.enrolled + "</b> / " + course.capacity + "</div>" +
      '<div class="mini-bar ' + (full ? "is-full" : "") + '"><i style="width:' + percent + '%"></i></div>' +
      action +
      "</div></div>"
    );
  },
};

/* ---------- 选课流程 ---------- */
function startEnroll(courseId) {
  const course = allCourses().find((item) => item.id === courseId);
  if (!course) return;
  if (isSelected(courseId)) {
    toast("这门课已经在你的课表里了");
    return;
  }
  if (course.enrolled >= course.capacity) {
    openLayer(
      '<div class="overlay overlay--center" data-close="1"><div class="dialog" role="dialog" aria-modal="true">' +
      '<div class="dialog__icon state-icon--danger">' + ic("users", "ic ic-28") + "</div>" +
      '<div class="dialog__title">这门课已满</div>' +
      '<p class="dialog__desc">「' + esc(course.name) + "」当前 " + course.enrolled + " / " + course.capacity + " 人，暂时没有空位。</p>" +
      '<div class="dialog__actions">' +
      '<button class="btn btn--secondary" data-action="close-layer">知道了</button>' +
      '<button class="btn btn--primary" data-action="close-layer">加入候补</button>' +
      "</div></div></div>"
    );
    return;
  }
  if (course.conflict) {
    openLayer(
      '<div class="overlay overlay--center" data-close="1"><div class="dialog" role="dialog" aria-modal="true">' +
      '<div class="dialog__icon state-icon--brand" style="background:var(--warning-bg);color:var(--warning)">' + ic("alert", "ic ic-28") + "</div>" +
      '<div class="dialog__title">时间冲突</div>' +
      '<p class="dialog__desc">「' + esc(course.name) + "」与已选课程<strong>" + esc(course.conflict) + "</strong>时间重叠。请先退掉冲突课程，或选择其他时间段。</p>" +
      '<div class="dialog__actions">' +
      '<button class="btn btn--secondary" data-action="close-layer">知道了</button>' +
      '<button class="btn btn--primary" data-action="go-schedule">查看课表</button>' +
      "</div></div></div>"
    );
    return;
  }

  openQueueSheet(course);
}

function openQueueSheet(course) {
  const position = 30 + Math.floor(Math.random() * 30);
  queueActive = true;
  let progress = 0;
  const total = 6000;
  const step = 120;

  openLayer(
    '<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="选课排队">' +
    '<div class="sheet__grip"></div>' +
    '<div class="queue">' +
    '<span class="badge badge--brand badge--dot">正在排队</span>' +
    '<div class="queue__num" style="margin-top:14px"><span id="q-pos">' + position + "</span><small> 位</small></div>" +
    '<div class="queue__label">正在为「' + esc(course.name) + "」排队，请不要关闭页面</div>" +
    '<div class="queue__bar progress"><div class="progress__bar" id="q-bar" style="width:0%"></div></div>' +
    '<div class="queue__meta"><span id="q-note">前面还有 ' + (position - 1) + ' 位同学</span><span id="q-time">约 6 秒</span></div>' +
    '<button class="btn btn--ghost btn--block" style="margin-top:18px" data-action="queue-cancel">取消排队</button>' +
    "</div></div></div>"
  );

  clearInterval(queueTimer);
  queueTimer = setInterval(() => {
    if (!queueActive) return;
    progress = Math.min(100, progress + (step / total) * 100);
    const bar = document.getElementById("q-bar");
    const posEl = document.getElementById("q-pos");
    const noteEl = document.getElementById("q-note");
    const timeEl = document.getElementById("q-time");
    if (!bar) { clearInterval(queueTimer); return; }
    bar.style.width = progress.toFixed(0) + "%";
    const remain = Math.max(0, Math.ceil((100 - progress) / 100 * 6));
    const pos = Math.max(0, Math.round(position * (1 - progress / 100)));
    if (posEl) posEl.textContent = String(pos);
    if (noteEl) noteEl.textContent = pos > 0 ? "前面还有 " + Math.max(0, pos - 1) + " 位同学" : "马上轮到你";
    if (timeEl) timeEl.textContent = remain > 0 ? "约 " + remain + " 秒" : "即将完成";

    if (progress >= 100) {
      clearInterval(queueTimer);
      queueActive = false;
      finishEnroll(course);
    }
  }, step);
}

function finishEnroll(course) {
  API.confirmEnroll(course.id)
    .then(() => {
      state.selected.push(course.id);
      course.enrolled += 1;
      state.courseCredits = Math.round((state.courseCredits + course.credit) * 10) / 10;
      closeLayer();
      renderAll();
      toast("选课成功：" + course.name);
    })
    .catch(() => {
      openLayer(
        '<div class="overlay overlay--center"><div class="dialog" role="dialog" aria-modal="true">' +
        '<div class="dialog__icon state-icon--danger">' + ic("alert", "ic ic-28") + "</div>" +
        '<div class="dialog__title">选课失败 · 名额已满</div>' +
        '<p class="dialog__desc">排队期间，「' + esc(course.name) + "」最后 1 个名额被其他同学选走。可以加入候补，有人退课时按顺序通知你。</p>" +
        '<div class="dialog__actions">' +
        '<button class="btn btn--secondary" data-action="close-layer">知道了</button>' +
        '<button class="btn btn--primary" data-action="queue-retry" data-id="' + course.id + '">重试</button>' +
        "</div>" +
        '<button class="btn btn--ghost btn--block" style="margin-top:8px" data-action="close-layer">加入候补（第 8 位）</button>' +
        "</div></div>"
      );
    });
}

function cancelQueue() {
  queueActive = false;
  clearInterval(queueTimer);
  closeLayer();
  toast("已取消排队，未产生选课记录");
}

function confirmWithdraw(courseId) {
  const course = allCourses().find((item) => item.id === courseId);
  if (!course) return;
  openLayer(
    '<div class="overlay overlay--center" data-close="1"><div class="dialog" role="dialog" aria-modal="true">' +
    '<div class="dialog__icon state-icon--brand" style="background:var(--danger-bg);color:var(--danger)">' + ic("alert", "ic ic-28") + "</div>" +
    '<div class="dialog__title">退掉「' + esc(course.name) + "」？</div>" +
    '<p class="dialog__desc">退课后名额会立即释放，其他同学可以选。若这是必修课，可能影响毕业学分。</p>' +
    '<div class="dialog__actions">' +
    '<button class="btn btn--secondary" data-action="close-layer">再想想</button>' +
    '<button class="btn btn--danger" data-action="do-withdraw" data-id="' + course.id + '">确认退课</button>' +
    "</div></div></div>"
  );
}
