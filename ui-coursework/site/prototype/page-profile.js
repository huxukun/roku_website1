/* ==========================================================
   page-profile.js —— P-06 我的 / 登录
   ========================================================== */

PAGES.profile = {
  bar() {
    return (
      '<div class="appbar__title">我的</div>' +
      '<div class="appbar__spacer"></div>' +
      '<button class="icon-btn" data-action="about" aria-label="设置">' + ic("settings") + "</button>"
    );
  },

  body() {
    const student = DB.student;
    return (
      '<div class="card">' +
      '<div class="profile">' +
      '<div class="avatar" aria-hidden="true">' + esc(student.name.slice(0, 1)) + "</div>" +
      "<div><div class=\"profile__name\">" + esc(student.name) + "</div>" +
      '<div class="profile__meta">' + esc(student.grade) + " · " + esc(student.major) + "</div>" +
      '<div class="profile__id">学号 ' + esc(student.id) + "</div></div>" +
      "</div></div>" +

      '<div class="section" style="margin-top:14px">' +
      '<div class="card" style="border-color:var(--brand-100);background:linear-gradient(160deg,#FBFDFF,#F3F8FF)">' +
      '<div class="row row--between">' +
      '<div class="row" style="gap:10px"><span class="quick__icon" style="width:36px;height:36px;border-radius:11px">' + ic("shield", "ic ic-20") + "</span>" +
      '<div><div class="strong" style="font-size:14px">统一身份认证</div>' +
      '<div class="small muted" style="margin-top:2px">单点登录 · 已免除 WebVPN</div></div></div>' +
      '<span class="badge badge--success badge--dot">已登录</span></div>' +
      '<div class="divider"></div>' +
      '<div class="row row--between"><span class="small muted">会话状态</span>' +
      '<span class="small strong">29 分钟后静默续期</span></div>' +
      '<button class="btn btn--secondary btn--sm btn--block" style="margin-top:12px" data-action="session-expire">模拟会话过期</button>' +
      "</div></div>" +

      '<div class="section">' +
      '<div class="section-head"><h2 class="section-title">设置</h2></div>' +
      '<div class="list">' +
      '<button class="list-item" data-action="toggle-notify">' +
      '<span class="list-item__icon">' + ic("bell", "ic ic-18") + "</span>" +
      '<span class="list-item__body"><span class="list-item__title">消息通知</span>' +
      '<span class="list-item__sub">评教截止、考试与成绩发布提醒</span></span>' +
      '<span class="switch ' + (state.notify ? "is-on" : "") + '" aria-hidden="true"></span>' +
      "</button>" +
      '<button class="list-item" data-action="about">' +
      '<span class="list-item__icon">' + ic("info", "ic ic-18") + "</span>" +
      '<span class="list-item__body"><span class="list-item__title">数据来源与声明</span>' +
      '<span class="list-item__sub">示意数据 · 非官方概念设计</span></span>' +
      ic("chevron-right", "ic ic-18 list-item__chev") +
      "</button>" +
      '<button class="list-item" data-action="help">' +
      '<span class="list-item__icon">' + ic("help", "ic ic-18") + "</span>" +
      '<span class="list-item__body"><span class="list-item__title">帮助与反馈</span>' +
      '<span class="list-item__sub">问题和建议会进入改进清单</span></span>' +
      ic("chevron-right", "ic ic-18 list-item__chev") +
      "</button>" +
      '<button class="list-item" data-action="about">' +
      '<span class="list-item__icon">' + ic("grad", "ic ic-18") + "</span>" +
      '<span class="list-item__body"><span class="list-item__title">关于本作品</span>' +
      '<span class="list-item__sub">UI 及交互设计实验课作业</span></span>' +
      ic("chevron-right", "ic ic-18 list-item__chev") +
      "</button>" +
      "</div></div>" +

      '<div class="section">' +
      '<div class="card demo-panel">' +
      '<div class="row row--between"><div><div class="strong" style="font-size:14px">原型演示开关</div>' +
      '<div class="small muted" style="margin-top:2px">触发 5 类异常状态，供评审查看</div></div>' +
      '<span class="badge badge--warn">仅评审</span></div>' +
      '<div class="demo-panel__grid">' +
      '<button class="demo-btn" data-action="demo-state" data-state="loading">加载中 · 骨架屏</button>' +
      '<button class="demo-btn" data-action="demo-state" data-state="empty">空状态</button>' +
      '<button class="demo-btn" data-action="demo-state" data-state="error">网络错误</button>' +
      '<button class="demo-btn" data-action="demo-state" data-state="session">会话过期</button>' +
      '<button class="demo-btn" data-action="demo-state" data-state="queue">选课排队</button>' +
      '<button class="demo-btn" data-action="clear-demo">恢复正常</button>' +
      "</div></div></div>" +

      '<button class="btn btn--ghost btn--block" style="margin-top:20px;color:var(--danger)" data-action="logout">' +
      ic("logout", "ic ic-16") + "退出登录</button>" +

      '<p class="disclaimer"><b>课程作业 · 概念设计 · 非官方</b><br>「南邮教务 · 体验重设计」与南京邮电大学官方无关，页面数据均为示意数据。<br>原型 v1.0 · 2026-11</p>'
    );
  },
};

/* ---------- 登录页 ---------- */
function pageLogin() {
  return {
    body:
      '<div class="login">' +
      '<div class="login__brand"><span class="login__logo" aria-hidden="true">教</span>' +
      '<div><div class="strong" style="font-size:15px">南邮教务</div>' +
      '<div class="small muted">体验重设计 · 概念版</div></div></div>' +

      '<h1 class="login__title">一次登录，<br>直接回到你要办的事。</h1>' +
      '<p class="login__lead">统一身份认证后即可访问课表、成绩、选课与考试，不再经过 WebVPN，也不会因为新开标签页重新登录。</p>' +

      '<div class="login__form">' +
      '<div class="field"><label for="login-id">学号</label>' +
      '<input class="input" id="login-id" type="text" inputmode="numeric" autocomplete="username" ' +
      'data-role="login-id" placeholder="请输入学号" value="' + esc(state.loginId) + '" /></div>' +
      '<div class="field"><label for="login-pwd">统一身份认证密码</label>' +
      '<input class="input" id="login-pwd" type="password" autocomplete="current-password" ' +
      'data-role="login-pwd" placeholder="请输入密码" value="' + esc(state.loginPwd) + '" /></div>' +
      (state.loginError
        ? '<div class="field-error" role="alert">' + ic("alert", "ic ic-16") + esc(state.loginError) + "</div>"
        : "") +
      '<button class="btn btn--primary btn--block" data-action="login"' + (state.loginLoading ? " disabled" : "") + ">" +
      (state.loginLoading ? "正在登录…" : ic("lock", "ic ic-16") + "统一身份认证登录") + "</button>" +
      "</div>" +

      '<div class="login__badges">' +
      '<span class="badge badge--brand">' + ic("wifi", "ic ic-16") + "免 VPN 直连</span>" +
      '<span class="badge badge--brand">单点登录</span>' +
      '<span class="badge badge--brand">会话静默续期</span>' +
      "</div>" +

      '<p class="login__hint">原型演示：任意非空学号与密码即可登录，不会发送任何请求。真实系统接入统一身份认证后，此处不出现二次登录。</p>' +

      '<div class="login__foot"><b>课程作业 · 概念设计 · 非官方</b><br>' +
      "本项目为 UI 及交互设计实验课作业，与南京邮电大学官方无关。</div>" +
      "</div>",
  };
}
