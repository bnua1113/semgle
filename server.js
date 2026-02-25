// server.js
// ✅ Google OAuth + "가입 완료(아이디/이름/보안코드)" + 세션 로그인 + 게시글 API(예시)
// 실행 전: npm i express express-session passport passport-google-oauth20 better-sqlite3 dotenv
// .env 필요: PORT, SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL

require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("./db");

const app = express();

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ======================
// Passport session wiring
// ======================
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  try {
    const user = db
      .prepare(
        "SELECT id, google_id, email, nickname, avatar_url, username, real_name, status, role FROM users WHERE id=?"
      )
      .get(id);
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

// ======================
// Google OAuth Strategy
// ======================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const nickname = profile.displayName || "사용자";
        const avatarUrl = profile.photos?.[0]?.value || null;

        let user = db.prepare("SELECT * FROM users WHERE google_id=?").get(googleId);

        // ✅ 없으면 "pending" 상태로 자동 생성(가입 미완료)
        if (!user) {
          const info = db
            .prepare(
              "INSERT INTO users (google_id, email, nickname, avatar_url, status) VALUES (?, ?, ?, ?, 'pending')"
            )
            .run(googleId, email, nickname, avatarUrl);
          user = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
        } else {
          // (선택) 구글 프로필 최신화
          db.prepare("UPDATE users SET email=?, nickname=?, avatar_url=? WHERE id=?").run(
            email,
            nickname,
            avatarUrl,
            user.id
          );
          user = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ======================
// Static
// ======================
app.use(express.static(path.join(__dirname, "public")));

// ======================
// Helpers / Middleware
// ======================
function requireGoogleSession(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "구글 로그인이 필요합니다." });
  next();
}

function requireActive(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "로그인이 필요합니다." });
  if (req.user.status !== "active") {
    return res.status(403).json({ message: "회원가입(추가입력)을 완료해야 이용할 수 있습니다." });
  }
  next();
}

// ======================
// Auth APIs
// ======================
app.get("/api/auth/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({
    user: {
      id: req.user.id,
      google_id: req.user.google_id,
      email: req.user.email,
      nickname: req.user.nickname,
      avatar_url: req.user.avatar_url,
      username: req.user.username,
      real_name: req.user.real_name,
      status: req.user.status,
      role: req.user.role,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.json({ ok: true }));
  });
});

// ======================
// Google OAuth routes
// ======================
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup.html" }),
  (req, res) => {
    // ✅ 가입 미완료(pending)면 추가정보 입력 페이지로
    if (req.user.status !== "active") return res.redirect("/complete-signup.html");
    return res.redirect("/index.html");
  }
);

// ======================
// Complete Signup (아이디/이름/보안코드)
// ======================
app.post("/api/auth/complete-signup", requireGoogleSession, (req, res) => {
  const username = String(req.body.username || "").trim();
  const real_name = String(req.body.real_name || "").trim();
  const security_code = String(req.body.security_code || "").trim();

  if (!username || !real_name || !security_code) {
    return res.status(400).json({ message: "아이디/이름/보안코드를 모두 입력하세요." });
  }

  // 이미 완료된 경우
  if (req.user.status === "active") {
    return res.json({ ok: true, already: true });
  }

  // username 중복 체크
  const exists = db.prepare("SELECT id FROM users WHERE username=?").get(username);
  if (exists) {
    return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
  }

  // 보안코드 검증(미사용 코드만 통과)
  const codeRow = db
    .prepare("SELECT code, is_used FROM signup_codes WHERE code=?")
    .get(security_code);

  if (!codeRow) {
    return res.status(403).json({ message: "보안코드가 올바르지 않습니다." });
  }
  if (codeRow.is_used) {
    return res.status(403).json({ message: "이미 사용된 보안코드입니다." });
  }

  // 트랜잭션: 유저 활성화 + 코드 사용 처리
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE users SET username=?, real_name=?, status='active' WHERE id=?"
    ).run(username, real_name, req.user.id);

    db.prepare(
      "UPDATE signup_codes SET is_used=1, used_by_user_id=?, used_at=datetime('now') WHERE code=?"
    ).run(req.user.id, security_code);
  });

  try {
    tx();
  } catch (e) {
    return res.status(500).json({ message: "가입 처리 중 오류가 발생했습니다." });
  }

  // 세션 user 갱신(다시 조회 후 login)
  const refreshed = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  req.login(refreshed, (err) => {
    if (err) return res.status(500).json({ message: "세션 갱신 실패" });
    return res.json({ ok: true });
  });
});

// ======================
// Posts APIs (예시)
// ======================
app.get("/api/posts", (req, res) => {
  const category = req.query.category ? String(req.query.category) : null;
  const type = req.query.type ? String(req.query.type) : "all";

  let sql = `
    SELECT p.id, p.category, p.type, p.title, p.content, p.created_at,
           u.nickname as author
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    sql += " AND p.category=?";
    params.push(category);
  }
  if (type && type !== "all") {
    sql += " AND p.type=?";
    params.push(type);
  }

  sql += " ORDER BY p.id DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ posts: rows });
});

app.post("/api/posts", requireActive, (req, res) => {
  const category = String(req.body.category || "").trim();
  const type = String(req.body.type || "").trim();
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();

  if (!category || !type || !title || !content) {
    return res.status(400).json({ message: "category/type/title/content 필수" });
  }

  const info = db
    .prepare(
      `INSERT INTO posts (author_id, category, type, title, content)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.user.id, category, type, title, content);

  res.json({ id: info.lastInsertRowid });
});

app.get("/api/posts/mine", requireActive, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, category, type, title, content, created_at
       FROM posts
       WHERE author_id=?
       ORDER BY id DESC`
    )
    .all(req.user.id);
  res.json({ posts: rows });
});

// (선택) 글 삭제: 작성자 또는 admin만
app.delete("/api/posts/:id", requireActive, (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isFinite(postId)) return res.status(400).json({ message: "잘못된 id" });

  const post = db.prepare("SELECT id, author_id FROM posts WHERE id=?").get(postId);
  if (!post) return res.status(404).json({ message: "게시물이 없습니다." });

  const isOwner = post.author_id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "삭제 권한이 없습니다." });
  }

  db.prepare("DELETE FROM posts WHERE id=?").run(postId);
  res.json({ ok: true });
});

// ======================
// Start
// ======================
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server running: http://localhost:${port}`));