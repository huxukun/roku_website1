/* ==========================================================
   page-exam.js —— P-05 考试
   ========================================================== */

PAGES.exam = {
  bar() {
    return (
      '<button class="icon-btn" data-action="back" aria-label="返回">' + ic("arrow-left") + "</button>" +
      '<div class="appbar__title">考试<div class="appbar__sub">' + DB.exams.length + " 场考试 · 12 月</div></div>" +
      '<div class="appbar__spacer"></div>' +
      '<button class="icon-btn" data-action="help" aria-label="考试说明">' + ic("help") + "</button>"
    );
  },

  body() {
    const next = DB.exams[0];
    const parts = countdownParts(next.dateISO);
    const mode = state.examMode || "list";

    return (
      '<div class="page-head">' +
      '<span class="eyebrow">考试安排 · 倒计时与考场座位</span>' +
      '<h1 class="page-title">下一场考试</h1>' +
      "</div>" +

      '<div class="card exam-hero" style="background:linear-gradient(160deg,#F7FAFF,#EAF2FF);border-color:var(--brand-100)">' +
      '<div style="flex:1;min-width:0"><div class="badge badge--brand">' + esc(next.name) + "</div>" +
      '<div class="strong" style="margin-top:10px">' + esc(next.dateISO.slice(5, 10).replace("-", " 月 ")) + " 日 · " + esc(next.time) + "</div>" +
      '<div class="small muted" style="margin-top:4px">' + esc(next.room) + " · 座位 " + esc(next.seat) + " 号</div></div>" +
      '<div class="exam-count" style="flex:none">' +
      '<div class="exam-count__unit"><div class="exam-count__v">' + parts.days + '</div><div class="exam-count__k">天</div></div>' +
      '<div class="exam-count__unit"><div class="exam-count__v">' + parts.hours + '</div><div class="exam-count__k">时</div></div>' +
      '<div class="exam-count__unit"><div class="exam-count__v">' + parts.minutes + '</div><div class="exam-count__k">分</div></div>' +
      "</div></div>" +

      '<div class="segmented segmented--block" style="margin:16px 0 14px" role="tablist" aria-label="考试视图">' +
      '<button data-action="exam-mode" data-mode="list" role="tab"' +
      (mode === "list" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">列表</button>" +
      '<button data-action="exam-mode" data-mode="calendar" role="tab"' +
      (mode === "calendar" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">日历</button>" +
      "</div>" +

      (mode === "list" ? this.list() : this.calendar()) +

      '<p class="disclaimer">考试安排为课程作业示意数据，请以教务系统正式通知为准。<br>考前 3 天会通过消息提醒考场与座位。</p>'
    );
  },

  list() {
    return (
      '<div class="card" style="padding-top:4px;padding-bottom:4px">' +
      DB.exams.map((exam) => {
        const days = daysUntil(exam.dateISO);
        return (
          '<div class="exam-card">' +
          '<div class="exam-date"><b>' + exam.day + "</b><span>" + exam.month + " 月</span></div>" +
          '<div class="exam-info" style="flex:1">' +
          '<div class="row row--between"><span class="exam-info__name">' + esc(exam.name) + "</span>" +
          '<span class="badge ' + (days <= 7 ? "badge--warn" : "badge--brand") + '">' + (days > 0 ? days + " 天后" : "今天") + "</span></div>" +
          '<div class="exam-info__meta">' +
          "<span>" + ic("clock", "ic ic-16") + esc(exam.time) + "</span>" +
          "<span>" + ic("pin", "ic ic-16") + esc(exam.room) + "</span>" +
          "<span>" + ic("door", "ic ic-16") + "座位 " + esc(exam.seat) + "</span>" +
          "</div></div></div>"
        );
      }).join("") +
      "</div>"
    );
  },

  calendar() {
    const year = 2026;
    const month = 12;
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 周一=0
    const daysInMonth = 31;
    const examDays = DB.exams.map((exam) => exam.day);

    let cells = ["一", "二", "三", "四", "五", "六", "日"]
      .map((day) => '<div class="cal__wk">' + day + "</div>")
      .join("");

    for (let i = 0; i < firstWeekday; i += 1) {
      cells += '<div class="cal__day is-blank"></div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isExam = examDays.indexOf(day) > -1;
      cells += '<button class="cal__day' + (isExam ? " is-exam" : "") + '"' +
        (isExam ? ' data-action="exam-day" data-label="12 月 ' + day + ' 日"' : "") +
        ">" + day + (isExam ? "<i></i>" : "") + "</button>";
    }

    return (
      '<div class="cal">' +
      '<div class="cal__head"><span class="strong">2026 年 12 月</span>' +
      '<span class="badge badge--brand">' + examDays.length + " 场考试</span></div>" +
      '<div class="cal__grid">' + cells + "</div>" +
      '<div class="divider"></div>' +
      '<div class="row" style="gap:16px;font-size:11px;color:var(--ink-500)">' +
      '<span class="row" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand-600);display:inline-block"></span>考试日</span>' +
      '<span class="row" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;box-shadow:inset 0 0 0 1.5px var(--brand-600);display:inline-block"></span>今天</span>' +
      "</div></div>"
    );
  },
};
