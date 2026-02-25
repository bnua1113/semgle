/* =========================
   ✅ Semgle script.js (fixed)
   ========================= */

// 로그인 상태 (true = 로그인됨, false = 비로그인)
let isLoggedIn = false;

/** ===== Login State (index) ===== */
const USER_KEY = "semgle_user";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

let CURRENT_USER = JSON.parse(localStorage.getItem(USER_KEY) || "null");

function syncAuthState() {
  CURRENT_USER = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  isLoggedIn = !!CURRENT_USER;
}

function updateAuthUI() {
  syncAuthState();

  if (loginBtn && logoutBtn) {
    if (CURRENT_USER) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    } else {
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
    }
  }
}

updateAuthUI();

// 로그인 버튼 → login.html 이동
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    location.href = "./login.html";
  });
}

// 로그아웃 처리
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(USER_KEY);
    CURRENT_USER = null;
    isLoggedIn = false;
    updateAuthUI();
    alert("로그아웃 되었습니다.");

    // 로그아웃하면 홈으로 보내기(선택)
    showPage("home");
    setActiveTab(null);
  });
}

/** ===== Theme ===== */
const THEME_KEY = "semgle_theme";
const themeToggle = document.getElementById("themeToggle");

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_KEY) || "light";
setTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "light" ? "dark" : "light");
  });
}

/** ===== Pages / Nav ===== */
const homePage = document.getElementById("home");
const contentPage = document.getElementById("contentPage");
const mypagePage = document.getElementById("mypage");

const categoryTitle = document.getElementById("categoryTitle");
const typeFilter = document.getElementById("typeFilter");

const logoBtn = document.querySelector(".logo");
const tabs = document.querySelectorAll(".tab"); // logo는 별도로 처리

function setActiveTab(tabEl) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
  if (tabEl && tabEl.classList.contains("tab")) tabEl.classList.add("is-active");
}

function showPage(pageName, titleText) {
  if (!homePage || !contentPage) return;

  // 모두 숨기기
  homePage.classList.remove("is-active");
  contentPage.classList.remove("is-active");
  if (mypagePage) mypagePage.classList.remove("is-active");

  // 페이지 표시
  if (pageName === "home") {
    homePage.classList.add("is-active");
    return;
  }

  if (pageName === "mypage") {
    if (mypagePage) {
      mypagePage.classList.add("is-active");
      renderMyPage();
    } else {
      homePage.classList.add("is-active");
    }
    return;
  }

  // 그 외는 contentPage로
  contentPage.classList.add("is-active");
  if (categoryTitle) categoryTitle.textContent = titleText || "카테고리";

  renderPosts(categoryTitle ? categoryTitle.textContent : "", typeFilter ? typeFilter.value : "all");
}

// 로고 클릭 = 홈
if (logoBtn) {
  logoBtn.addEventListener("click", () => {
    setActiveTab(null);
    showPage("home");
  });
}

// 탭 클릭 = 카테고리 페이지
tabs.forEach((el) => {
  el.addEventListener("click", () => {
    syncAuthState(); // ✅ 클릭할 때마다 최신 로그인 상태 반영

    const categoryName = el.textContent.trim();

    // 🔐 내 노트는 로그인 필요
    if (categoryName === "내 노트" && !isLoggedIn) {
      alert("로그인을 해야 들어갈 수 있습니다.");
      location.href = "./login.html";
      return;
    }

    setActiveTab(el);
    showPage("content", categoryName);
  });
});

// 마이페이지 버튼
const mypageBtn = document.getElementById("mypageBtn");
if (mypageBtn) {
  mypageBtn.addEventListener("click", () => {
    syncAuthState(); // ✅ 클릭할 때마다 최신 로그인 상태 반영

    if (!isLoggedIn) {
      alert("로그인을 해야 마이페이지를 이용할 수 있습니다.");
      location.href = "./login.html";
      return;
    }

    setActiveTab(null);
    showPage("mypage");
  });
}

/** ===== Local posts ===== */
const POSTS_KEY = "semgle_posts_v2";
let posts = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");

function fmtDate(ts) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPosts(category, type) {
  const postList = document.getElementById("postList");
  const emptyState = document.getElementById("emptyState");
  if (!postList) return;

  postList.innerHTML = "";

  const filtered = posts
    .filter((p) => p.category === category)
    .filter((p) => (type === "all" ? true : p.type === type));

  if (filtered.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }
  if (emptyState) emptyState.hidden = true;

  filtered
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((post) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.innerHTML = `
        <div class="post-card__meta">
          <span class="badge">${escapeHtml(post.category)}</span>
          <span class="badge">${escapeHtml(post.type)}</span>
          <span class="badge">작성자: ${escapeHtml(post.author || "알수없음")}</span>
          <span class="badge">${fmtDate(post.createdAt)}</span>
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.content || "").slice(0, 140)}${(post.content || "").length > 140 ? "…" : ""}</p>
      `;
      postList.appendChild(card);
    });
}

/** ===== Filter ===== */
if (typeFilter) {
  typeFilter.addEventListener("change", () => {
    if (contentPage && contentPage.classList.contains("is-active")) {
      renderPosts(categoryTitle ? categoryTitle.textContent : "", typeFilter.value);
    }
  });
}

/** ===== Modal: Create post ===== */
const modal = document.getElementById("modal");
const writeBtn = document.getElementById("writeBtn");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const savePost = document.getElementById("savePost");

const postTitle = document.getElementById("postTitle");
const postCategory = document.getElementById("postCategory");
const postType = document.getElementById("postType");
const postContent = document.getElementById("postContent");

function openModal() {
  syncAuthState();
  if (!isLoggedIn) {
    alert("로그인이 필요합니다.");
    location.href = "./login.html";
    return;
  }

  if (!modal) return;
  modal.classList.remove("hidden");
  if (postTitle) postTitle.focus();
}

function closeModalFn() {
  if (!modal) return;
  modal.classList.add("hidden");
}

if (writeBtn) writeBtn.addEventListener("click", openModal);
if (closeModal) closeModal.addEventListener("click", closeModalFn);
if (cancelBtn) cancelBtn.addEventListener("click", closeModalFn);

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close === "true") closeModalFn();
  });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) closeModalFn();
});

if (savePost) {
  savePost.addEventListener("click", () => {
    syncAuthState();

    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      location.href = "./login.html";
      return;
    }

    const title = (postTitle?.value || "").trim();
    const category = postCategory?.value || "내 노트";
    const type = postType?.value || "문서";
    const content = (postContent?.value || "").trim();

    if (!title) {
      alert("제목은 필수입니다.");
      postTitle?.focus();
      return;
    }

    const newPost = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      category,
      type,
      content,
      author: (CURRENT_USER?.nickname) || "게스트", // ✅ null safe
      createdAt: Date.now(),
    };

    posts.push(newPost);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));

    // reset
    if (postTitle) postTitle.value = "";
    if (postContent) postContent.value = "";
    if (postType) postType.value = "문서";
    if (postCategory) postCategory.value = category;

    closeModalFn();

    // 현재 카테고리 화면이면 즉시 반영
    if (contentPage && contentPage.classList.contains("is-active")) {
      renderPosts(categoryTitle ? categoryTitle.textContent : "", typeFilter ? typeFilter.value : "all");
    }

    // 마이페이지에서도 즉시 반영
    if (mypagePage && mypagePage.classList.contains("is-active")) {
      renderMyPage();
    }
  });
}

/** ===== Home Notice Render (max 3) ===== */
const noticeGrid = document.getElementById("noticeGrid");

const HOME_NOTICES = [
  { date: "02.12", title: "2월달 일정입니다.", desc: "최대한 빠지지 말아주세요." },
  { date: "02.12", title: "현수는 멍청하다.", desc: "김동예가 한말" },
  { date: "02.12", title: "지방 기능경기 대회 일정", desc: "궁금하신거 있으면 현수한테 물어보세요." },
];

function renderHomeNotices() {
  if (!noticeGrid) return;

  const items = HOME_NOTICES.slice(0, 3);
  noticeGrid.innerHTML = "";

  items.forEach((n) => {
    const el = document.createElement("article");
    el.className = "notice__item";
    el.innerHTML = `
      <div class="notice__date">${escapeHtml(n.date)}</div>
      <h3 class="notice__title">${escapeHtml(n.title)}</h3>
      <p class="notice__desc">${escapeHtml(n.desc)}</p>
    `;
    noticeGrid.appendChild(el);
  });
}

renderHomeNotices();

/** ===== MyPage Render ===== */
const myInfo = document.getElementById("myInfo");
const myPostList = document.getElementById("myPostList");
const myEmpty = document.getElementById("myEmpty");

function renderMyPage() {
  syncAuthState();

  if (!isLoggedIn) {
    if (myInfo) myInfo.textContent = "로그인이 필요합니다.";
    return;
  }

  if (myInfo) {
    myInfo.innerHTML = `
      <div>아이디: <b>${escapeHtml(CURRENT_USER?.id || "")}</b></div>
      <div>닉네임: <b>${escapeHtml(CURRENT_USER?.nickname || "")}</b></div>
      <div class="muted" style="margin-top:6px;">(프로토타입: localStorage 기반)</div>
    `;
  }

  if (!myPostList) return;
  myPostList.innerHTML = "";

  const me = CURRENT_USER?.nickname || "";
  const mine = posts
    .filter((p) => (p.author || "") === me)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (mine.length === 0) {
    if (myEmpty) myEmpty.hidden = false;
    return;
  }
  if (myEmpty) myEmpty.hidden = true;

  mine.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.innerHTML = `
      <div class="post-card__meta">
        <span class="badge">${escapeHtml(post.category)}</span>
        <span class="badge">${escapeHtml(post.type)}</span>
        <span class="badge">${fmtDate(post.createdAt)}</span>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.content || "").slice(0, 140)}${(post.content || "").length > 140 ? "…" : ""}</p>
    `;
    myPostList.appendChild(card);
  });
}