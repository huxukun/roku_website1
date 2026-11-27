/* ==========================================================
   mock.js —— 单一数据源（演示数据，非真实教务数据）
   ========================================================== */

const DB = {
  student: {
    name: "林晓",
    id: "2024012345",
    major: "计算机科学与技术",
    grade: "2024 级",
    college: "计算机学院",
  },

  term: {
    label: "2026-2027 学年 第一学期",
    short: "2026-2027-1",
    week: 12,
    totalWeeks: 20,
    todayIndex: 5, // 周一=1 … 周日=7（2026-11-27 为周五）
    todayLabel: "11 月 27 日 · 第 12 周 周五",
  },

  weekDays: [
    { index: 1, name: "周一", date: "23" },
    { index: 2, name: "周二", date: "24" },
    { index: 3, name: "周三", date: "25" },
    { index: 4, name: "周四", date: "26" },
    { index: 5, name: "周五", date: "27" },
    { index: 6, name: "周六", date: "28" },
    { index: 7, name: "周日", date: "29" },
  ],

  todayCourses: [
    {
      id: "cs-prob",
      name: "概率论与数理统计",
      teacher: "陈静",
      room: "教3-108",
      start: "08:00",
      end: "09:40",
      status: "done",
      tone: "blue",
    },
    {
      id: "cs-phy-exp",
      name: "大学物理实验",
      teacher: "李伟",
      room: "物理实验楼 204",
      start: "10:00",
      end: "11:40",
      status: "now",
      tone: "green",
    },
    {
      id: "cs-pe",
      name: "体育（羽毛球）",
      teacher: "赵强",
      room: "体育馆 2 号场",
      start: "14:00",
      end: "15:40",
      status: "next",
      tone: "amber",
    },
  ],

  // 周视图课程：period 1–8，每周 8 节
  timetable: [
    { id: "c-math", name: "高等数学 A(下)", teacher: "张敏", room: "教3-201", weekday: 1, start: 1, end: 2, tone: "blue" },
    { id: "c-phy", name: "大学物理（下）", teacher: "李伟", room: "教2-105", weekday: 1, start: 3, end: 4, tone: "green" },
    { id: "c-ds", name: "数据结构", teacher: "王芳", room: "计算机楼 402", weekday: 2, start: 1, end: 2, tone: "violet" },
    { id: "c-eng", name: "大学英语（四）", teacher: "Emily Chen", room: "教1-308", weekday: 2, start: 3, end: 4, tone: "pink" },
    { id: "c-algo", name: "算法设计与分析", teacher: "王芳", room: "计算机楼 305", weekday: 2, start: 5, end: 6, tone: "violet" },
    { id: "c-marx", name: "马克思主义基本原理", teacher: "刘洋", room: "教4-101", weekday: 4, start: 1, end: 2, tone: "amber" },
    { id: "c-ds-exp", name: "数据结构实验", teacher: "王芳", room: "计算机楼 305", weekday: 4, start: 5, end: 6, tone: "violet" },
    { id: "c-prob", name: "概率论与数理统计", teacher: "陈静", room: "教3-108", weekday: 5, start: 1, end: 2, tone: "blue" },
    { id: "c-phy-exp", name: "大学物理实验", teacher: "李伟", room: "物理实验楼 204", weekday: 5, start: 3, end: 4, tone: "green" },
    { id: "c-pe", name: "体育（羽毛球）", teacher: "赵强", room: "体育馆 2 号场", weekday: 5, start: 5, end: 6, tone: "amber" },
    { id: "c-ml-time", name: "机器学习导论", teacher: "周航", room: "计算机楼 401", weekday: 3, start: 7, end: 8, tone: "blue" },
  ],

  todos: [
    { id: "t1", name: "评教：马克思主义基本原理", meta: "截止 11 月 30 日", time: "3 天后", done: false },
    { id: "t2", name: "预订下学期教材", meta: "截止 12 月 02 日", time: "5 天后", done: false },
    { id: "t3", name: "核对个人培养方案", meta: "截止 12 月 05 日", time: "8 天后", done: false },
  ],

  latestGrades: [
    { name: "数据结构", score: 92, point: 4.2 },
    { name: "概率论与数理统计", score: 88, point: 3.8 },
  ],

  nextExam: {
    id: "e1",
    name: "高等数学 A(下)",
    dateISO: "2026-12-21T09:00:00+08:00",
    dateLabel: "12 月 21 日 09:00",
    room: "教3-201",
    seat: "24",
  },

  gradeTerms: [
    { id: "2026-2027-1", label: "2026-2027-1", note: "本学期" },
    { id: "2025-2026-2", label: "2025-2026-2", note: "" },
    { id: "2025-2026-1", label: "2025-2026-1", note: "" },
    { id: "2024-2025-2", label: "2024-2025-2", note: "" },
  ],

  grades: {
    "2026-2027-1": { gpa: null, rank: "—", credits: 0, list: [] },
    "2025-2026-2": {
      gpa: 3.72,
      rank: "专业前 18%",
      credits: 17,
      gpaPercent: 74,
      list: [
        { name: "数据结构", credit: 4.0, score: 92, point: 4.2, type: "必修", usual: 94, final: 91 },
        { name: "概率论与数理统计", credit: 3.0, score: 88, point: 3.8, type: "必修", usual: 90, final: 87 },
        { name: "大学物理（下）", credit: 3.0, score: 78, point: 2.8, type: "必修", usual: 82, final: 76 },
        { name: "大学英语（三）", credit: 2.0, score: 85, point: 3.5, type: "必修", usual: 86, final: 84 },
        { name: "中国近现代史纲要", credit: 2.0, score: 83, point: 3.3, type: "必修", usual: 85, final: 82 },
        { name: "程序设计实践", credit: 2.0, score: 95, point: 4.5, type: "选修", usual: 96, final: 94 },
        { name: "体育（乒乓球）", credit: 1.0, score: 90, point: 4.0, type: "必修", usual: 91, final: 89 },
      ],
    },
    "2025-2026-1": {
      gpa: 3.56,
      rank: "专业前 26%",
      credits: 16,
      gpaPercent: 68,
      list: [
        { name: "高等数学 A(上)", credit: 5.0, score: 86, point: 3.6, type: "必修", usual: 88, final: 85 },
        { name: "线性代数", credit: 3.0, score: 91, point: 4.1, type: "必修", usual: 92, final: 90 },
        { name: "计算机导论", credit: 2.0, score: 94, point: 4.5, type: "必修", usual: 95, final: 93 },
        { name: "大学英语（二）", credit: 2.0, score: 82, point: 3.3, type: "必修", usual: 84, final: 81 },
        { name: "思想道德与法治", credit: 3.0, score: 80, point: 3.0, type: "必修", usual: 82, final: 79 },
        { name: "体育（篮球）", credit: 1.0, score: 87, point: 3.7, type: "必修", usual: 88, final: 86 },
      ],
    },
    "2024-2025-2": {
      gpa: 3.48,
      rank: "专业前 31%",
      credits: 14,
      gpaPercent: 63,
      list: [
        { name: "程序设计基础", credit: 4.0, score: 89, point: 3.9, type: "必修", usual: 91, final: 88 },
        { name: "离散数学", credit: 3.0, score: 84, point: 3.4, type: "必修", usual: 86, final: 83 },
        { name: "大学英语（一）", credit: 2.0, score: 79, point: 2.9, type: "必修", usual: 80, final: 78 },
        { name: "军事理论", credit: 2.0, score: 88, point: 3.8, type: "必修", usual: 90, final: 87 },
        { name: "艺术鉴赏", credit: 1.0, score: 92, point: 4.2, type: "通识", usual: 93, final: 91 },
      ],
    },
  },

  credits: { earned: 68, required: 160, selected: 23.5, limit: 28 },

  courses: {
    available: [
      { id: "c-dip", name: "数字图像处理", teacher: "孙倩", time: "周一 5-6 节", room: "计算机楼 306", credit: 2.5, type: "选修", enrolled: 45, capacity: 60, conflict: null },
      { id: "c-algo2", name: "算法设计与分析", teacher: "王芳", time: "周二 5-6 节", room: "计算机楼 305", credit: 2.5, type: "必修", enrolled: 76, capacity: 90, conflict: null },
      { id: "c-net", name: "计算机网络", teacher: "郑凯", time: "周四 1-2 节", room: "教3-202", credit: 3.0, type: "必修", enrolled: 32, capacity: 80, conflict: "马克思主义基本原理（周四 1-2 节）" },
      { id: "c-innov2", name: "创新创业基础", teacher: "吴敏", time: "周四 3-4 节", room: "教5-101", credit: 1.5, type: "通识", enrolled: 89, capacity: 100, conflict: null },
      { id: "c-viz", name: "数据可视化", teacher: "陈默", time: "周三 5-6 节", room: "计算机楼 308", credit: 2.0, type: "选修", enrolled: 59, capacity: 60, conflict: null },
      { id: "c-phy2", name: "大学物理实验（二）", teacher: "李伟", time: "周五 5-6 节", room: "物理实验楼", credit: 1.0, type: "必修", enrolled: 60, capacity: 60, conflict: null },
      { id: "c-art", name: "影视鉴赏", teacher: "何静", time: "周三 9-10 节", room: "教1-201", credit: 1.0, type: "通识", enrolled: 150, capacity: 150, conflict: null },
    ],
    selected: [
      { id: "c-ml", name: "机器学习导论", teacher: "周航", time: "周三 7-8 节", room: "计算机楼 401", credit: 2.0, type: "选修", enrolled: 118, capacity: 120 },
      { id: "c-innov", name: "创新创业基础", teacher: "吴敏", time: "周四 3-4 节", room: "教5-101", credit: 1.5, type: "通识", enrolled: 89, capacity: 100 },
    ],
  },

  exams: [
    { id: "e1", name: "高等数学 A(下)", dateISO: "2026-12-21T09:00:00+08:00", day: 21, month: 12, time: "09:00–11:00", room: "教3-201", seat: "24", type: "闭卷" },
    { id: "e2", name: "大学物理（下）", dateISO: "2026-12-23T14:00:00+08:00", day: 23, month: 12, time: "14:00–16:00", room: "教2-105", seat: "17", type: "闭卷" },
    { id: "e3", name: "数据结构", dateISO: "2026-12-25T09:00:00+08:00", day: 25, month: 12, time: "09:00–11:00", room: "计算机楼 402", seat: "31", type: "闭卷" },
    { id: "e4", name: "大学英语（四）", dateISO: "2026-12-28T14:00:00+08:00", day: 28, month: 12, time: "14:00–15:40", room: "教1-308", seat: "09", type: "闭卷" },
  ],
};
