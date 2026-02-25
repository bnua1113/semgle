async function fetchMe() {
  const res = await fetch("/api/auth/me");
  return res.json();
}

function setMsg(el, text, isErr=false) {
  el.textContent = text;
  el.style.color = isErr ? "rgba(255,180,180,.95)" : "rgba(255,255,255,.70)";
}

(async () => {
  const googleBox = document.getElementById("googleBox");
  const form = document.getElementById("completeForm");
  const msg = document.getElementById("msg");

  const me = await fetchMe();
  if (!me.user) {
    alert("구글 로그인이 필요합니다.");
    location.href = "/signup.html";
    return;
  }

  // 이미 가입 완료면 메인으로
  if (me.user.status === "active") {
    location.href = "/index.html";
    return;
  }

  googleBox.innerHTML = `
    <div class="muted">구글 계정: <b>${me.user.email || "알 수 없음"}</b></div>
    <div class="muted">구글 이름: <b>${me.user.nickname || "사용자"}</b></div>
  `;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const real_name = document.getElementById("realName").value.trim();
    const security_code = document.getElementById("securityCode").value.trim();

    if (!username || !real_name || !security_code) {
      setMsg(msg, "모든 항목을 입력하세요.", true);
      return;
    }

    const res = await fetch("/api/auth/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, real_name, security_code }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(msg, data.message || "오류가 발생했습니다.", true);
      return;
    }

    setMsg(msg, "회원가입 완료! 메인으로 이동합니다…");
    setTimeout(() => location.href = "/index.html", 400);
  });
})();