/* ==========================================================
   page-grades.js —— P-03 成绩
   ========================================================== */

PAGES.grades = {
  bar() {
    return (
      '<div class="appbar__title">成绩<div class="appbar__sub">累计 GPA 3.61 · 已修 68 学分</div></div>' +
      '<div class="appbar__spacer"></div>' +
      '<button class="icon-btn" data-action="help" aria-label="成绩说明">' + ic("help") + "</button>"
    );
  },

  body() {
    const term = DB.grades[state.term] || { gpa: null, rank: "—", credits: 0, list: [] };
    const isCurrent = state.term === "2026-2027-1";

    const termChips = DB.gradeTerms.map((item) =>
      '<button class="chip' + (state.term === item.id ? " is-active chip--brand" : "") + '"' +
      ' data-action="pick-term" data-term="' + item.id + '">' + item.label + "</button>"
    ).join("");

    if (isCurrent) {
      return (
        this.head() +
        '<div class="chips" style="margin-bottom:16px">' + termChips + "</div>" +
        '<div class="card state-card">' +
        '<div class="state-icon state-icon--brand">' + ic("clock", "ic ic-28") + "</div>" +
        '<div class="state-title">本学期成绩还没发布</div>' +
        '<p class="state-desc">2026-2027-1 学期的考试在 12 月底进行，成绩通常在考后两周内陆续公布。已出的科目会第一时间出现在这里。</p>' +
        '<div class="state-actions">' +
        '<button class="btn btn--secondary btn--sm" data-action="pick-term" data-term="2025-2026-2">看上学期</button>' +
        '<button class="btn btn--ghost btn--sm" data-action="help">成绩说明</button>' +
        "</div></div>" +
        this.note()
      );
    }

    const filtered = term.list.filter((item) => {
      if (state.gradeFilter === "all") return true;
      return item.type === state.gradeFilter;
    });

    const rows = filtered.map((item, index) =>
      '<div class="grade-row" data-action="grade-detail" data-id="' + state.term + "-" + index + '" role="button" tabindex="0">' +
      '<div style="flex:1;min-width:0">' +
      '<div class="grade-row__name">' + esc(item.name) + "</div>" +
      '<div class="grade-row__meta">' + item.credit.toFixed(1) + " 学分 · " + esc(item.type) + " · 绩点 " + item.point.toFixed(1) + "</div>" +
      "</div>" +
      '<div class="grade-row__score"><b>' + item.score + "</b>" +
      '<div class="grade-pill ' + (item.score >= 90 ? "grade-pill--good" : item.score < 80 ? "grade-pill--warn" : "") + '">' +
      (item.score >= 90 ? "优秀" : item.score >= 80 ? "良好" : "通过") + "</div></div>" +
      "</div>"
    ).join("");

    const emptyFiltered =
      '<div class="card state-card" style="padding:24px 16px">' +
      '<div class="state-title" style="font-size:14px">这个分类下没有成绩</div>' +
      '<p class="state-desc">换一个筛选条件试试。</p>' +
      '<div class="state-actions"><button class="btn btn--secondary btn--sm" data-action="grade-filter" data-filter="all">查看全部</button></div>' +
      "</div>";

    return (
      this.head() +
      '<div class="chips" style="margin-bottom:14px">' + termChips + "</div>" +

      '<div class="card gpa-card">' +
      '<div class="ring" style="--v:' + (term.gpaPercent || 0) + '" role="img" aria-label="平均绩点 ' + (term.gpa || 0) + '">' +
      '<div class="ring__inner"><div class="ring__value">' + (term.gpa == null ? "—" : term.gpa.toFixed(2)) + "</div>" +
      '<div class="ring__label">学期 GPA</div></div></div>' +
      '<div style="flex:1;min-width:0">' +
      '<div class="row row--between"><span class="small muted">学期排名</span><span class="badge badge--brand">' + esc(term.rank) + "</span></div>" +
      '<div class="gpa-facts">' +
      '<div><div class="gpa-fact__v">' + (term.credits || 0) + '</div><div class="gpa-fact__k">本学期学分</div></div>' +
      '<div><div class="gpa-fact__v">' + (filtered.length ? (filtered.reduce((sum, item) => sum + item.score * item.credit, 0) / filtered.reduce((sum, item) => sum + item.credit, 0)).toFixed(1) : "—") + '</div><div class="gpa-fact__k">加权平均分</div></div>' +
      "</div></div></div>" +

      '<div class="section" style="margin-top:18px">' +
      '<div class="section-head"><h2 class="section-title">课程成绩</h2>' +
      '<span class="section-note">' + filtered.length + " 门</span></div>" +
      '<div class="chips" style="margin-bottom:10px">' +
      ['all', '必修', '选修', '通识'].map((type) =>
        '<button class="chip' + (state.gradeFilter === type ? " is-active" : "") + '"' +
        ' data-action="grade-filter" data-filter="' + type + '">' + (type === "all" ? "全部" : type) + "</button>"
      ).join("") +
      "</div>" +
      '<div class="card" style="padding-top:4px;padding-bottom:4px">' + (filtered.length ? rows : emptyFiltered) + "</div>" +
      "</div>" +

      this.note()
    );
  },

  head() {
    return (
      '<div class="page-head">' +
      '<span class="eyebrow">学业成绩 · 查成绩 2 步完成</span>' +
      '<h1 class="page-title">成绩概览</h1>' +
      '<p class="page-sub">按学期查看 GPA、排名与每门课的成绩构成。</p>' +
      "</div>"
    );
  },

  note() {
    return '<p class="disclaimer">成绩与排名为课程作业示意数据，以教务系统正式记录为准。<br>改版前查成绩 4 步 → 改版后 2 步。</p>';
  },
};

function openGradeDetail(id) {
  const termId = id.split("-").slice(0, 3).join("-");
  const index = Number(id.split("-").pop());
  const term = DB.grades[termId];
  const item = term && term.list[index];
  if (!item) return;

  openLayer(
    '<div class="overlay" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="成绩详情">' +
    '<div class="sheet__grip"></div>' +
    '<div class="row row--between" style="align-items:flex-start">' +
    "<div><div class=\"sheet__title\">" + esc(item.name) + "</div>" +
    '<div class="sheet__sub">' + termId + " 学期 · " + esc(item.type) + "</div></div>" +
    '<div class="center"><div class="serif" style="font-size:34px;line-height:1;color:var(--brand-900)">' + item.score + "</div>" +
    '<div class="small muted">总评</div></div></div>' +
    '<div class="divider"></div>' +
    '<dl class="kv"><dt>平时成绩</dt><dd>' + item.usual + '</dd></dl>' +
    '<dl class="kv"><dt>期末成绩</dt><dd>' + item.final + '</dd></dl>' +
    '<dl class="kv"><dt>学分</dt><dd>' + item.credit.toFixed(1) + '</dd></dl>' +
    '<dl class="kv"><dt>绩点</dt><dd>' + item.point.toFixed(1) + '</dd></dl>' +
    '<dl class="kv"><dt>成绩等级</dt><dd>' + (item.score >= 90 ? "优秀" : item.score >= 80 ? "良好" : "通过") + '</dd></dl>' +
    '<p class="small muted" style="margin-top:14px;line-height:1.7">如对成绩有疑问，可在成绩公布后 5 个工作日内向开课学院申请复核。</p>' +
    '<button class="btn btn--secondary btn--block" style="margin-top:16px" data-action="close-layer">关闭</button>' +
    "</div></div>"
  );
}
