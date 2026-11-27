/* ==========================================================
   api.js —— 模拟 API 层
   说明：本文件只返回本地 mock 数据，用来展示真实接口的
   形状、延迟与错误分支；接入后端时替换实现即可。
   ========================================================== */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const API = {
  // TODO: replace with POST /api/auth/login  { id, password } -> { token, student }
  async login({ id, password }) {
    await wait(650);
    if (!id || !password) {
      const error = new Error("请输入学号和密码");
      error.code = "INVALID_INPUT";
      throw error;
    }
    return { code: 0, data: DB.student };
  },

  // TODO: replace with GET /api/home -> { term, todayCourses, todos, latestGrades, nextExam }
  async getHome() {
    await wait(520);
    return {
      code: 0,
      data: {
        term: DB.term,
        todayCourses: DB.todayCourses,
        todos: DB.todos,
        latestGrades: DB.latestGrades,
        nextExam: DB.nextExam,
      },
    };
  },

  // TODO: replace with GET /api/timetable?week=12 -> { week, courses }
  async getTimetable(week) {
    await wait(420);
    return { code: 0, data: { week, courses: DB.timetable } };
  },

  // TODO: replace with GET /api/grades?term=2025-2026-2 -> { gpa, rank, credits, list }
  async getGrades(term) {
    await wait(480);
    return { code: 0, data: DB.grades[term] || { gpa: null, rank: "—", credits: 0, list: [] } };
  },

  // TODO: replace with POST /api/enrollment -> { queuePosition, etaSeconds }
  async enroll(courseId) {
    await wait(420);
    const all = [...DB.courses.available, ...DB.courses.selected];
    const course = all.find((item) => item.id === courseId);
    if (!course) {
      const error = new Error("课程不存在");
      error.code = "NOT_FOUND";
      throw error;
    }
    if (course.conflict) {
      const error = new Error("时间冲突");
      error.code = "CONFLICT";
      error.detail = course.conflict;
      throw error;
    }
    if (course.enrolled >= course.capacity) {
      const error = new Error("名额已满");
      error.code = "FULL";
      throw error;
    }
    return {
      code: 0,
      data: {
        queuePosition: 30 + Math.floor(Math.random() * 30),
        etaSeconds: 6,
        course,
      },
    };
  },

  // TODO: replace with POST /api/enrollment/:id/confirm -> { status, course }
  // 演示：数据可视化在排队结束时名额被抢完，用于展示失败重试分支
  async confirmEnroll(courseId) {
    await wait(300);
    if (courseId === "c-viz") {
      const error = new Error("名额已满");
      error.code = "FULL";
      error.detail = "排队期间名额被其他同学选完";
      throw error;
    }
    const course = DB.courses.available.find((item) => item.id === courseId);
    return { code: 0, data: { status: "enrolled", course } };
  },

  // TODO: replace with DELETE /api/enrollment/:id -> { status }
  async withdraw(courseId) {
    await wait(380);
    return { code: 0, data: { status: "withdrawn", courseId } };
  },

  // TODO: replace with GET /api/exams -> { exams }
  async getExams() {
    await wait(430);
    return { code: 0, data: { exams: DB.exams } };
  },
};
