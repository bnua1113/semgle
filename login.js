/** ===== Theme System ===== */
const THEME_KEY = "semgle_theme";
const themeToggle = document.getElementById("themeToggle");

function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
setTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
});

// login.js (DB 없이 localStorage 기반)
const USER_KEY = "semgle_user";

const form = document.getElementById("loginForm");
const userIdEl = document.getElementById("userId");
const nicknameEl = document.getElementById("nickname");
const msgEl = document.getElementById("msg");
const guestBtn = document.getElementById("guestBtn");

// 이미 로그인 되어있으면 바로 메인으로
const existing = JSON.parse(localStorage.getItem(USER_KEY) || "null");
if (existing && existing.nickname) {
  location.href = "./index.html";
}

function setMsg(text, isError = false){
  msgEl.textContent = text;
  msgEl.style.color = isError ? "rgba(255,180,180,.95)" : "rgba(255,255,255,.70)";
}

function sanitize(s){
  return String(s).trim().replace(/\s+/g, " ");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = sanitize(userIdEl.value);
  const nickname = sanitize(nicknameEl.value);

  if (!id || !nickname) {
    setMsg("아이디와 닉네임을 입력하세요.", true);
    return;
  }

  const user = {
    id,
    nickname,
    createdAt: Date.now()
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setMsg("로그인 완료! 메인으로 이동합니다…");

  // 메인 이동
  setTimeout(() => {
    location.href = "./index.html";
  }, 400);
});

guestBtn.addEventListener("click", () => {
  // 게스트로 들어가기 (원하면 저장 안 하고 이동해도 됨)
  const guest = {
    id: "guest",
    nickname: "게스트",
    createdAt: Date.now(),
    isGuest: true
  };
  localStorage.setItem(USER_KEY, JSON.stringify(guest));
  location.href = "./index.html";
});