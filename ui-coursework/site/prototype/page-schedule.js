/* ==========================================================
   page-schedule.js —— P-02 课表
   ========================================================== */

const PERIOD_TIMES = {
  1: "08:00",
  2: "08:50",
  3: "10:00",
  4: "10:50",
  5: "14:00",
  6: "14:50",
  7: "16:00",
  8: "16:50",
};

PAGES.schedule = {
  bar() {
    const today = state.day === DB.term.todayIndex && state.week === DB.term.week;
    return (
      '<div class="appbar__title">课表<div class="appbar__sub">' +
      state.week + " / " + DB.term.totalWeeks + " 周" + (today ? " · 本周" : "") + "</div></div>" +
      '<div class="appbar__spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" data-action="week-now">回到本周</button>'
    );
  },

  body() {
    const strip = DB.weekDays.map((day) => {
      const isToday = day.index === DB.term.todayIndex && state.week === DB.term.week;
      const isActive = day.index === state.day;
      const hasClass = DB.timetable.some((course) => course.weekday === day.index);
      return (
        '<button class="weekday' + (isToday ? " is-today" : "") + (isActive ? " is-active" : "") + '"' +
        ' data-action="pick-day" data-day="' + day.index + '"' +
        ' aria-label="' + day.name + ' 11 月 ' + day.date + ' 日"' +
        (isActive ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" +
        "<span>" + day.name.slice(1) + "</span>" +
        '<span class="weekday__num">' + day.date + "</span>" +
        (hasClass ? '<span class="weekday__dot"></span>' : "") +
        "</button>"
      );
    }).join("");

    return (
      '<div class="page-head" style="padding-bottom:12px">' +
      '<span class="eyebrow">课程表 · 第 ' + state.week + " 周</span>" +
      '<h1 class="page-title">这一周怎么安排</h1>' +
      "</div>" +

      '<div class="row" style="margin-bottom:10px">' +
      '<button class="icon-btn" data-action="week-prev" aria-label="上一周">' + ic("chevron-left") + "</button>" +
      '<div class="center" style="flex:1"><div class="strong" style="font-size:15px">第 ' + state.week + " 周</div>" +
      '<div class="small muted">11 月 23 日 – 11 月 29 日</div></div>' +
      '<button class="icon-btn" data-action="week-next" aria-label="下一周">' + ic("chevron-right") + "</button>" +
      "</div>" +

      '<div class="weekstrip" style="margin-bottom:12px">' + strip + "</div>" +

      '<div class="segmented segmented--block" style="margin-bottom:16px" role="tablist" aria-label="课表视图">' +
      '<button data-action="schedule-mode" data-mode="day" role="tab"' +
      (state.scheduleMode === "day" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">日视图</button>" +
      '<button data-action="schedule-mode" data-mode="week" role="tab"' +
      (state.scheduleMode === "week" ? ' class="is-active" aria-selected="true"' : ' aria-selected="false"') + ">周视图</button>" +
      "</div>" +

      (state.scheduleMode === "day" ? this.dayView() : this.weekView()) +

      '<p class="disclaimer">课表数据为课程作业示意数据，非真实教务安排。<br>改版前查课表 3 步 → 改版后 1 步直达。</p>'
    );
  },

  dayView() {
    const day = DB.weekDays.find((item) => item.index === state.day) || DB.weekDays[0];
    const courses = DB.timetable
      .filter((course) => course.weekday === state.day)
      .sort((a, b) => a.start - b.start);

    if (!courses.length) {
      return (
        '<div class="card state-card">' +
        '<div class="state-icon state-icon--brand">' + ic("calendar", "ic ic-28") + "</div>" +
        '<div class="state-title">' + day.name + "没有课</div>" +
        '<p class="state-desc">这一天没有排课安排。可以去「选课」看看还有哪些课程可选。</p>' +
        '<div class="state-actions"><button class="btn btn--secondary btn--sm" data-action="go-courses">去选课</button></div>' +
        "</div>"
      );
    }

    const list = courses.map((course) =>
      '<div class="course-line ' + toneClass(course.tone) + '" data-action="open-course" data-id="' + course.id + '" role="button" tabindex="0">' +
      '<div class="course-line__tone"></div>' +
      '<div class="course-line__time">' + PERIOD_TIMES[course.start] + "<br>" +
      (PERIOD_TIMES[course.end + 1] || "") + "</div>" +
      '<div class="course-line__body">' +
      '<div class="course-line__name">' + esc(course.name) + "</div>" +
      '<div class="course-line__meta">' +
      "<span>" + ic("pin", "ic ic-16") + esc(course.room) + "</span>" +
      "<span>" + ic("user", "ic ic-16") + esc(course.teacher) + "</span>" +
      "</div></div></div>"
    ).join("");

    return (
      '<div class="course-day">' +
      '<div class="course-day__head"><div><div class="strong">' + day.name + " · 11 月 " + day.date + " 日</div>" +
      '<div class="course-day__date">' + courses.length + " 门课 · 共 " + (courses.length * 2) + " 节</div></div>" +
      '<span class="badge badge--brand">' + (state.week === DB.term.week && day.index === DB.term.todayIndex ? "今天" : "第 " + state.week + " 周") + "</span></div>" +
      '<div class="course-day__list">' + list + "</div>" +
      "</div>"
    );
  },

  weekView() {
    const dayHeads = DB.weekDays.slice(0, 5).map((day) =>
      '<div class="tt__day">' + day.name + "<br><span style=\"font-size:9px;color:var(--ink-300)\">" + day.date + "</span></div>"
    ).join("");

    let cells = '<div class="tt__corner"></div>' + dayHeads;

    for (let period = 1; period <= 8; period += 1) {
      cells += '<div class="tt__time" style="grid-row:' + (period + 1) + ';grid-column:1">' + period + "</div>";
      for (let col = 1; col <= 5; col += 1) {
        cells += '<div class="tt__cell" style="grid-row:' + (period + 1) + ';grid-column:' + (col + 1) + '"></div>';
      }
    }

    const blocks = DB.timetable
      .filter((course) => course.weekday >= 1 && course.weekday <= 5)
      .map((course) => {
        const col = course.weekday + 1;
        const rowStart = course.start + 1;
        const rowEnd = course.end + 2;
        return (
          '<button class="tt__block ' + toneClass(course.tone) + '"' +
          ' style="grid-column:' + col + ";grid-row:" + rowStart + " / " + rowEnd + '"' +
          ' data-action="open-course" data-id="' + course.id + '">' +
          "<b>" + esc(course.name) + "</b><span>" + esc(course.room) + "</span></button>"
        );
      }).join("");

    return (
      '<div class="tt" role="grid" aria-label="周课表">' + cells + blocks + "</div>" +
      '<p class="small muted" style="margin-top:10px;padding:0 4px">点击课程块查看课程详情与上课周次。</p>'
    );
  },
};

function openCourseDetail(courseId) {
  const course = DB.timetable.find((item) => item.id === courseId);
  if (!course) return;
  const day = DB.weekDays.find((item) => item.index === course.weekday);
  openLayer(
    '<div class="overlay" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="课程详情">' +
    '<div class="sheet__grip"></div>' +
    '<div class="row row--between" style="align-items:flex-start">' +
    '<div><div class="sheet__title">' + esc(course.name) + '</div>' +
    '<div class="sheet__sub">' + esc(course.teacher) + " · " + esc(course.room) + "</div></div>" +
    '<span class="badge badge--brand">' + esc(course.name.indexOf("实验") > -1 ? "实验课" : "必修") + "</span></div>" +
    '<div class="divider"></div>' +
    '<dl class="kv"><dt>上课时间</dt><dd>' + day.name + " 第 " + course.start + "–" + course.end + " 节</dd></dl>" +
    '<dl class="kv"><dt>具体时段</dt><dd>' + PERIOD_TIMES[course.start] + " – " + (PERIOD_TIMES[course.end + 1] || "") + "</dd></dl>" +
    '<dl class="kv"><dt>上课周次</dt><dd>第 1 – 16 周</dd></dl>' +
    '<dl class="kv"><dt>课程类型</dt><dd>专业必修</dd></dl>' +
    '<div class="stack stack--8" style="margin-top:18px">' +
    '<button class="btn btn--primary btn--block" data-action="close-layer">' + ic("bell", "ic ic-16") + "设置上课提醒</button>" +
    '<button class="btn btn--ghost btn--block" data-action="close-layer">查看课程资料</button>' +
    "</div></div></div>"
  );
}
