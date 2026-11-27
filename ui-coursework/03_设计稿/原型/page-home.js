/* ==========================================================
   page-home.js —— P-01 首页 / 今日
   ========================================================== */

PAGES.home = {
  bar() {
    return (
      '<div class="appbar__title" style="font-size:15px">' +
      '<span style="display:inline-flex;align-items:center;gap:7px">' +
      '<span style="width:8px;height:8px;border-radius:3px;background:var(--brand-600);display:inline-block"></span>' +
      "南邮教务</span></div>" +
      '<div class="appbar__spacer"></div>' +
      '<button class="icon-btn" data-action="notify" aria-label="通知">' + ic("bell") + "</button>"
    );
  },

  body() {
    const term = DB.term;
    const nowCourse = DB.todayCourses.find((course) => course.status === "now");
    const doneCount = DB.todayCourses.filter((course) => course.status === "done").length;

    const timeline = DB.todayCourses.map((course) => {
      const cls = course.status === "done" ? " is-done" : course.status === "now" ? " is-now" : "";
      const statusText = course.status === "done" ? "已结束" : course.status === "now" ? "即将开始" : "待开始";
      return (
        '<li class="tl__item' + cls + '">' +
        '<div class="tl__time">' + esc(course.start) + "<br>" + esc(course.end) + "</div>" +
        '<div class="tl__rail"><span class="tl__dot"></span></div>' +
        '<div class="tl__body">' +
        '<div class="tl__name">' + esc(course.name) + "</div>" +
        '<div class="tl__meta"><span>' + ic("pin", "ic ic-16") + esc(course.room) + "</span>" +
        "<span>" + ic("clock", "ic ic-16") + statusText + "</span></div>" +
        "</div></li>"
      );
    }).join("");

    const todos = state.todos.map((todo) =>
      '<div class="todo' + (todo.done ? " is-done" : "") + '">' +
      '<button class="todo__check" data-action="toggle-todo" data-id="' + todo.id + '"' +
      ' aria-label="' + (todo.done ? "标记为未完成" : "标记为已完成") + '"' +
      ' aria-pressed="' + (todo.done ? "true" : "false") + '">' +
      (todo.done ? ic("check", "ic ic-16") : "") + "</button>" +
      '<div style="flex:1;min-width:0"><div class="todo__name">' + esc(todo.name) + "</div>" +
      '<div class="todo__meta">' + esc(todo.meta) + "</div></div>" +
      '<span class="todo__time ' + (todo.done ? "muted" : "badge badge--warn") + '">' + esc(todo.time) + "</span>" +
      "</div>"
    ).join("");

    const quick = [
      { action: "go-grade", icon: "chart", label: "查成绩" },
      { action: "go-exam", icon: "calendar", label: "查考试" },
      { action: "go-courses", icon: "book", label: "选课" },
      { action: "open-eval", icon: "clipboard", label: "评教" },
    ].map((item) =>
      '<button class="quick" data-action="' + item.action + '">' +
      '<span class="quick__icon">' + ic(item.icon, "ic ic-20") + "</span>" +
      "<span>" + item.label + "</span></button>"
    ).join("");

    const latest = DB.latestGrades.map((grade) =>
      '<div class="grade-row" style="padding:11px 0">' +
      '<div style="flex:1"><div class="grade-row__name" style="font-size:13px">' + esc(grade.name) + "</div>" +
      '<div class="grade-row__meta">绩点 ' + grade.point.toFixed(1) + "</div></div>" +
      '<div class="grade-row__score"><b style="font-size:17px">' + grade.score + "</b>" +
      '<div class="grade-pill grade-pill--good">已出分</div></div>' +
      "</div>"
    ).join("");

    const exam = DB.nextExam;
    const examDays = daysUntil(exam.dateISO);

    return (
      // Hero
      '<section class="hero">' +
      '<div class="hero__top"><span class="hero__date">' + esc(term.todayLabel) + "</span>" +
      '<span class="badge" style="background:rgba(255,255,255,.16);color:#fff">' + term.week + " / " + term.totalWeeks + " 周</span></div>" +
      '<h1 class="hero__greeting">上午好，<em>' + esc(DB.student.name) + "</em></h1>" +
      '<div class="hero__meta">今天有 ' + DB.todayCourses.length + " 门课，已完成 " + doneCount + " 门</div>" +
      (nowCourse
        ? '<div class="hero__now">' +
          '<div><div class="hero__now-time">' + esc(nowCourse.start) + " – " + esc(nowCourse.end) + "</div>" +
          '<div class="hero__now-name">' + esc(nowCourse.name) + "</div>" +
          '<div class="hero__now-room">' + esc(nowCourse.room) + " · " + esc(nowCourse.teacher) + "</div></div>" +
          '<div class="hero__now-right"><span class="live-dot">即将开始</span></div>' +
          "</div>"
        : "") +
      "</section>" +

      // 今日课程
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">今日课程</h2>' +
      '<button class="link" data-action="go-schedule">完整课表' + ic("chevron-right", "ic ic-16") + "</button></div>" +
      '<div class="card"><ul class="tl">' + timeline + "</ul></div>" +
      "</section>" +

      // 待办
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">待办</h2>' +
      '<span class="section-note">' + state.todos.filter((item) => !item.done).length + " 项未完成</span></div>" +
      '<div class="card">' + todos + "</div>" +
      "</section>" +

      // 快捷入口
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">快捷入口</h2>' +
      '<span class="section-note">高频任务 ≤3 步</span></div>' +
      '<div class="quick-grid">' + quick + "</div>" +
      "</section>" +

      // 最新成绩
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">最新成绩</h2>' +
      '<button class="link" data-action="go-grade">全部成绩' + ic("chevron-right", "ic ic-16") + "</button></div>" +
      '<div class="card" style="padding-top:6px;padding-bottom:6px">' + latest + "</div>" +
      "</section>" +

      // 下次考试
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">下次考试</h2>' +
      '<button class="link" data-action="go-exam">考试安排' + ic("chevron-right", "ic ic-16") + "</button></div>" +
      '<button class="card" data-action="go-exam" style="width:100%;text-align:left;display:block">' +
      '<div class="row row--between"><div>' +
      '<div class="strong" style="font-size:15px">' + esc(exam.name) + "</div>" +
      '<div class="small muted" style="margin-top:4px">' + esc(exam.dateLabel) + " · " + esc(exam.room) + "</div>" +
      "</div>" +
      '<div class="center" style="flex:none"><div class="serif" style="font-size:28px;line-height:1;color:var(--brand-900)">' + examDays + "</div>" +
      '<div class="small muted">天后</div></div></div>' +
      "</button>" +
      "</section>" +

      '<p class="disclaimer"><b>课程作业 · 概念设计 · 非官方</b><br>本项目为南京邮电大学 UI 及交互设计实验课作业，与学校官方无关；页面数据均为示意数据。</p>'
    );
  },
};
