// ============================================================
//  FOXY — app.js (completo e corrigido)
//  Firebase Auth + Firestore + UI + Jogos + Configurações
// ============================================================

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ════════════════════════════════════════════════════════════
//  CONSTANTES
// ════════════════════════════════════════════════════════════

const MAX_INTERESTS = 3;

const AVATARS = [
  { id:"gato",    emoji:"🐱", label:"Gato"     },
  { id:"raposa",  emoji:"🦊", label:"Raposa"   },
  { id:"urso",    emoji:"🐻", label:"Urso"     },
  { id:"panda",   emoji:"🐼", label:"Panda"    },
  { id:"coelho",  emoji:"🐰", label:"Coelho"   },
  { id:"pinguim", emoji:"🐧", label:"Pinguim"  },
  { id:"sapo",    emoji:"🐸", label:"Sapo"     },
  { id:"lobo",    emoji:"🐺", label:"Lobo"     },
  { id:"hamster", emoji:"🐹", label:"Hamster"  },
  { id:"leao",    emoji:"🦁", label:"Leão"     },
  { id:"elefante",emoji:"🐘", label:"Elefante" },
  { id:"tartaruga",emoji:"🐢",label:"Tartaruga"},
];

const AVATAR_MAP = Object.fromEntries(AVATARS.map(a => [a.id, a.emoji]));

const INTERESTS_LIST = [
  { id:"musica",     emoji:"🎵", label:"Música"      },
  { id:"jogos",      emoji:"🎮", label:"Jogos"       },
  { id:"animes",     emoji:"🎌", label:"Animes"      },
  { id:"livros",     emoji:"📚", label:"Livros"      },
  { id:"arte",       emoji:"🎨", label:"Arte"        },
  { id:"culinaria",  emoji:"🍳", label:"Culinária"   },
  { id:"tecnologia", emoji:"💻", label:"Tecnologia"  },
  { id:"natureza",   emoji:"🌿", label:"Natureza"    },
  { id:"filmes",     emoji:"🎬", label:"Filmes"      },
  { id:"esportes",   emoji:"⚽", label:"Esportes"    },
  { id:"fotografia", emoji:"📷", label:"Fotografia"  },
  { id:"viagens",    emoji:"✈️", label:"Viagens"    },
];

// Mapa de jogo → arquivo HTML
const PAGE_MAP = {
  landing:      "index.html",
  login:        "login.html",
  register:     "register.html",
  dashboard:    "dashboard.html",
  games:        "games.html",
  waiting:      "waiting.html",
  profile:      "profile.html",
  achievements: "achievements.html",
  settings:     "settings.html",
  safety:       "safety.html",
  // Jogos individuais
  "draw-game":   "draw-game.html",
  "story-game":  "story-game.html",
  "quiz-game":   "quiz-game.html",
  "puzzle-game": "puzzle-game.html",
  "emoji-game":  "emoji-game.html",
};

// Mapa de ID do jogo → página HTML
const GAME_PAGE_MAP = {
  draw:   "draw-game.html",
  story:  "story-game.html",
  quiz:   "quiz-game.html",
  puzzle: "puzzle-game.html",
  emoji:  "emoji-game.html",
};

const GAMES_DATA = [
  { id:"draw",   emoji:"🎨", title:"Desenho Colaborativo", desc:"Criem juntos em 5 min",    time:"5 min", color:"var(--blue-pale)"   },
  { id:"story",  emoji:"📖", title:"História Coletiva",    desc:"Escrevam uma história",     time:"3 min", color:"var(--purple-pale)" },
  { id:"quiz",   emoji:"🧩", title:"Quiz Cooperativo",     desc:"Respondam em equipe",       time:"3 min", color:"var(--green-pale)"  },
  { id:"puzzle", emoji:"🖼️", title:"Puzzle em Equipe",    desc:"Montem juntos",             time:"4 min", color:"#FFF3E0"            },
  { id:"emoji",  emoji:"😄", title:"Adivinhe o Emoji",     desc:"Descubram o emoji secreto", time:"2 min", color:"#FCE4EC"            },
];

const FRIENDS_DATA = [
  { emoji:"🦊", name:"Lucas",  status:"Jogando 🎮" },
  { emoji:"🐢", name:"Pedro",  status:"Online 💚"  },
  { emoji:"🦋", name:"Marina", status:"Modo quieto 🌙" },
];

const ACHIEVEMENTS_DATA = [
  { emoji:"🤝", name:"Primeira Conexão",   desc:"Completou sua 1ª sessão!",      unlocked:true  },
  { emoji:"📖", name:"Historiador Gentil", desc:"Escreveu uma história completa", unlocked:true  },
  { emoji:"🌙", name:"Parceiro Calmo",     desc:"10 sessões no modo silencioso",  unlocked:true  },
  { emoji:"🌺", name:"Jardim Florido",     desc:"5 conexões diferentes",          unlocked:false },
  { emoji:"🏆", name:"Cooperador Estelar", desc:"50 sessões completadas",         unlocked:false },
  { emoji:"🌈", name:"Arco-Íris",          desc:"Jogou todos os mini-games",      unlocked:false },
];

// ════════════════════════════════════════════════════════════
//  ESTADO LOCAL
// ════════════════════════════════════════════════════════════
let selectedAvatar    = null;
let selectedInterests = [];
let selectedComfort   = "low";
let currentUser       = null;
let currentGame       = null;
const googleProvider  = new GoogleAuthProvider();
// Força o seletor de contas Google toda vez que o usuário clicar em "Entrar com Google"
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ════════════════════════════════════════════════════════════
//  LOADING SCREEN
// ════════════════════════════════════════════════════════════
function initLoader() {
  const loader = document.getElementById("foxy-loader");
  if (!loader) return;

  // Crossfade entre imagens
  const imgA = loader.querySelector(".loader-img.a");
  const imgB = loader.querySelector(".loader-img.b");
  if (imgA && imgB) {
    let showA = true;
    const iv = setInterval(() => {
      showA = !showA;
      imgA.style.opacity = showA ? "1" : "0";
      imgB.style.opacity = showA ? "0" : "1";
    }, 600);
    // Esconde após carregamento
    window.addEventListener("load", () => {
      clearInterval(iv);
      setTimeout(() => {
        loader.classList.add("hidden");
        loader.addEventListener("transitionend", () => loader.remove(), { once: true });
      }, 400);
    });
  }
}

// ════════════════════════════════════════════════════════════
//  PWA — Service Worker
// ════════════════════════════════════════════════════════════
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════
//  1. AUTH STATE
// ════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const page  = document.body.dataset.page;
  if (user) {
    if (page === "login" || page === "register") {
      window.location.href = "dashboard.html";
    } else {
      await loadUserUI(user);
    }
  } else {
    const publicPages = ["login", "register", "landing"];
    if (!publicPages.includes(page)) {
      window.location.href = "login.html";
    }
  }
});

// ════════════════════════════════════════════════════════════
//  2. NAVEGAÇÃO
// ════════════════════════════════════════════════════════════
window.showPage = function(pageName) {
  const url = PAGE_MAP[pageName];
  if (url) window.location.href = url;
};
window.goBack = function() { history.back(); };

// ════════════════════════════════════════════════════════════
//  3. TOAST
// ════════════════════════════════════════════════════════════
window.showToast = function(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" };
  const icon  = icons[type] ?? "ℹ️";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast-show"));
  });
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 4000);
};

// ════════════════════════════════════════════════════════════
//  4. FIRESTORE
// ════════════════════════════════════════════════════════════
async function upsertUserDoc(user, extra = {}) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:          user.uid,
      displayName:  extra.displayName ?? user.displayName ?? "Anônimo",
      email:        user.email ?? null,
      avatar:       extra.avatar ?? "raposa",
      interests:    extra.interests ?? [],
      comfortLevel: extra.comfortLevel ?? "low",
      provider:     extra.provider ?? "email",
      googleId:     user.providerData?.[0]?.uid ?? null,
      stats: { sessions: 0, friends: 0, achievements: 3, streak: 1 },
      createdAt:    serverTimestamp(),
      lastLogin:    serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { lastLogin: serverTimestamp() });
  }
}

window.fetchCurrentUserDoc = async function() {
  if (!currentUser) return null;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  return snap.exists() ? snap.data() : null;
};

// ════════════════════════════════════════════════════════════
//  5. AUTENTICAÇÃO
// ════════════════════════════════════════════════════════════
window.loginWithEmail = async function() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const pass  = document.getElementById("loginPass")?.value;
  const btn   = document.querySelector(".btn-primary");
  clearFieldError("loginEmail"); clearFieldError("loginPass");
  let ok = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError("loginEmail","E-mail inválido."); ok=false; }
  if (!pass || pass.length < 6) { setFieldError("loginPass","Mínimo 6 caracteres."); ok=false; }
  if (!ok) return;
  setButtonLoading(btn, true, "Entrando…");
  try {
    const c = await signInWithEmailAndPassword(auth, email, pass);
    await upsertUserDoc(c.user, { provider:"email" });
    showToast("Bem-vindo(a) de volta! 🌟", "success");
  } catch(e) { showToast(translateAuthError(e.code), "error"); }
  finally    { setButtonLoading(btn, false); }
};

window.loginWithGoogle = async function() {
  const btn = document.querySelector(".social-btn");
  setButtonLoading(btn, true, "Conectando ao Google…");
  try {
    const r = await signInWithPopup(auth, googleProvider);
    await upsertUserDoc(r.user, { provider:"google", displayName:r.user.displayName });
    showToast(`Olá, ${r.user.displayName?.split(" ")[0] ?? "você"}! 🌿`, "success");
  } catch(e) {
    if (e.code !== "auth/popup-closed-by-user") showToast(translateAuthError(e.code), "error");
  } finally { setButtonLoading(btn, false); }
};

window.loginAnonymously_ = async function() {
  const btn = document.querySelector(".btn-ghost");
  setButtonLoading(btn, true, "Criando sessão…");
  try {
    const c = await signInAnonymously(auth);
    await upsertUserDoc(c.user, { provider:"anonymous", displayName:gerarNomeAnonimo(), avatar:"raposa" });
    showToast("Entrando como visitante 🌙", "info");
  } catch(e) { showToast(translateAuthError(e.code), "error"); }
  finally    { setButtonLoading(btn, false); }
};

window.logout = async function() {
  try { await signOut(auth); window.location.href = "login.html"; }
  catch { showToast("Erro ao sair.", "error"); }
};

// ════════════════════════════════════════════════════════════
//  6. REGISTRO
// ════════════════════════════════════════════════════════════
window.completeRegister = async function() {
  const btn   = document.querySelector(".btn-primary");
  const name  = document.getElementById("regName")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const pass  = document.getElementById("regPass")?.value;
  clearFieldError("regName"); clearFieldError("regEmail"); clearFieldError("regPass");
  let ok = true;
  if (!name || name.length < 2) { setFieldError("regName","Mínimo 2 caracteres."); ok=false; }
  if (!selectedAvatar) { showToast("Escolha um avatar! 🎨", "error"); ok=false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError("regEmail","E-mail inválido."); ok=false; }
  if (email && pass && pass.length < 6) { setFieldError("regPass","Mínimo 6 caracteres."); ok=false; }
  if (!ok) return;
  setButtonLoading(btn, true, "Criando sua conta…");
  try {
    let c;
    if (email && pass) {
      c = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(c.user, { displayName: name });
    } else {
      c = await signInAnonymously(auth);
    }
    await upsertUserDoc(c.user, {
      displayName:  name,
      email:        email ?? null,
      avatar:       selectedAvatar,
      interests:    selectedInterests,
      comfortLevel: selectedComfort,
      provider:     email ? "email" : "anonymous",
    });
    showToast(`Conta criada! Bem-vindo(a), ${name}! 🌟`, "success");
  } catch(e) { showToast(translateAuthError(e.code), "error"); }
  finally    { setButtonLoading(btn, false); }
};

// ════════════════════════════════════════════════════════════
//  7. TEMA E CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════
window.toggleTheme = function() {
  const dark = document.documentElement.dataset.theme === "dark";
  const next  = dark ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeButtons(next);
};

function syncThemeButtons(theme) {
  document.querySelectorAll("[data-theme-btn]").forEach(btn => {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro");
  });
  const old = document.getElementById("themeBtn") ?? document.getElementById("darkToggle");
  if (old) {
    old.textContent = theme === "dark" ? "☀️" : "🌙";
    old.setAttribute("aria-checked", String(theme === "dark"));
  }
}

window.toggleSensory  = function() { _toggle("sensory-mode",  "sensoryToggle",  "sensory");  };
window.toggleContrast = function() { _toggle("high-contrast", "contrastToggle", "contrast"); };
window.toggleDyslexia = function() { _toggle("dyslexia-font", "dyslexiaToggle", "dyslexia"); };
window.toggleMotion   = function() { _toggle("reduce-motion", "motionToggle",   "motion");   };

function _toggle(cls, btnId, key) {
  document.body.classList.toggle(cls);
  const on = document.body.classList.contains(cls);
  const b  = document.getElementById(btnId);
  if (b) b.setAttribute("aria-checked", String(on));
  localStorage.setItem(key, on);
  // Sync checkboxes too
  document.querySelectorAll(`[data-setting="${key}"]`).forEach(el => {
    if (el.type === "checkbox") el.checked = on;
  });
}

window.toggleSound  = function() { _toggleBtn("soundToggle",  "sound");  };
window.toggleSilent = function() { _toggleBtn("silentToggle", "silent"); };

function _toggleBtn(id, key) {
  const b  = document.getElementById(id);
  const on = b?.getAttribute("aria-checked") === "true";
  if (b) b.setAttribute("aria-checked", String(!on));
  localStorage.setItem(key, !on);
}

window.setAmbient = function(type) {
  ["none","rain","waves","forest"].forEach(t => {
    const b = document.getElementById(`ambient-${t}`);
    if (b) { b.classList.toggle("active", t === type); b.setAttribute("aria-checked", String(t === type)); }
  });
  showToast(type === "none" ? "Som desativado 🔇" : `Som ambiente: ${type} 🎵`, "info");
};

window.changeFontSize = function(delta) {
  const cur  = parseFloat(localStorage.getItem("fontSize") ?? "18");
  const next = Math.min(26, Math.max(14, cur + delta));
  document.documentElement.style.fontSize = next + "px";
  localStorage.setItem("fontSize", next);
  const disp = document.getElementById("fontSizeDisplay");
  if (disp) disp.textContent = next + "px";
};

// ════════════════════════════════════════════════════════════
//  8. DASHBOARD
// ════════════════════════════════════════════════════════════
window.setMood = function(mood) {
  const msgs = {
    great: "Que ótimo! 🎉 Aproveite seus jogos!",
    good:  "Perfeito 😊 Seja bem-vindo!",
    ok:    "Tudo bem 🌿 Aqui é um lugar seguro.",
    tired: "Descanse 🌙 Sem pressão, ok?",
    quiet: "Modo quieto ✨ Respira, você está seguro aqui.",
  };
  showToast(msgs[mood] ?? "Obrigado por compartilhar 🌸", "info");
};

function renderGamesGrid(id, limit = 999) {
  const grid = document.getElementById(id);
  if (!grid) return;
  grid.innerHTML = GAMES_DATA.slice(0, limit).map(g => `
    <div class="game-card" role="listitem" tabindex="0"
      onclick="openComfort('${g.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' ')openComfort('${g.id}')">
      <div class="game-icon" style="background:${g.color}">${g.emoji}</div>
      <div class="game-info">
        <div class="game-title">${g.title}</div>
        <div class="game-desc">${g.desc}</div>
      </div>
      <div class="game-time" aria-label="Duração: ${g.time}">${g.time}</div>
    </div>`).join("");
}

function renderFriendsList() {
  const list = document.getElementById("friendsList");
  if (!list) return;
  list.innerHTML = FRIENDS_DATA.map(f => `
    <div class="friend-item" role="listitem">
      <div class="friend-avatar" aria-hidden="true">${f.emoji}</div>
      <div class="friend-info">
        <div class="friend-name">${f.name}</div>
        <div class="friend-status">${f.status}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="showToast('Convite enviado para ${f.name}! 💌','success')" aria-label="Convidar ${f.name}">
        Convidar
      </button>
    </div>`).join("");
}

function renderAchievementsList() {
  const list = document.getElementById("achievementsList");
  if (!list) return;
  list.innerHTML = ACHIEVEMENTS_DATA.map(a => `
    <div class="achievement ${a.unlocked ? "" : "locked"}" role="listitem" aria-label="${a.unlocked ? a.name + ': ' + a.desc : 'Conquista bloqueada'}">
      <span class="achievement-icon" aria-hidden="true">${a.unlocked ? a.emoji : "🔒"}</span>
      <span class="achievement-name">${a.unlocked ? a.name : "???"}</span>
      ${a.unlocked ? `<span style="font-size:0.7rem;color:var(--text3);text-align:center">${a.desc}</span>` : ""}
    </div>`).join("");
}

// ════════════════════════════════════════════════════════════
//  9. MODAL CONFORTO + JOGO
// ════════════════════════════════════════════════════════════
window.openComfort = function(gameId) {
  currentGame = gameId;
  const m = document.getElementById("comfortModal");
  if (m) {
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    m.querySelector("[data-close], .comfort-btn")?.focus();
  }
};
window.closeComfort = function() {
  const m = document.getElementById("comfortModal");
  if (m) {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
  }
};
window.startGame = function(mode) {
  closeComfort();
  const gamePage = GAME_PAGE_MAP[currentGame] ?? "games.html";
  if (mode === "ai" || mode === "silent") {
    window.location.href = `${gamePage}?mode=${mode}&solo=1`;
  } else {
    window.location.href = `waiting.html?game=${currentGame}&mode=${mode}`;
  }
};
window.leaveGame = function() {
  if (confirm("Sair do jogo?\nSeu progresso será salvo. 🌸")) {
    window.location.href = "dashboard.html";
  }
};

// ════════════════════════════════════════════════════════════
//  10. CHAT GUIADO
// ════════════════════════════════════════════════════════════
window.sendChatMsg = function() {
  const input = document.getElementById("chatInput");
  const msg   = input?.value.trim();
  if (!msg) return;
  addChatMessage("Você", msg, true);
  input.value = "";
  input.focus();
  setTimeout(() => addChatMessage("Foxy IA 🦊", gerarRespostaIA(msg)), 700);
};
window.sendQuickReply = function(msg) {
  addChatMessage("Você", msg, true);
  setTimeout(() => addChatMessage("Foxy IA 🦊", gerarRespostaIA(msg)), 700);
};
function addChatMessage(author, text, mine = false) {
  const area = document.getElementById("chatMessages");
  if (!area) return;
  const d = document.createElement("div");
  d.className = `chat-msg${mine ? " mine" : ""}`;
  d.innerHTML = `<span class="chat-author">${author}:</span> ${text}`;
  area.appendChild(d);
  area.scrollTop = area.scrollHeight;
}
window.toggleChat = function() {
  document.getElementById("chatPanel")?.classList.toggle("minimized");
};
function gerarRespostaIA(msg) {
  const r = [
    "Que ideia incrível! 💙 Vamos continuar!",
    "Adorei! 😄 Você é muito criativo(a)!",
    "Muito criativo! 🎨 Pode ir em frente!",
    "Ótimo! 🌟 Juntos chegamos mais longe!",
    "Você é incrível! 🌸 Estou aqui com você!",
    "Perfeito! 🌈 Continue assim!",
  ];
  return r[Math.floor(Math.random() * r.length)];
}

// ════════════════════════════════════════════════════════════
//  11. CANVAS (Draw Game)
// ════════════════════════════════════════════════════════════
let isDrawing = false;
let drawColor = "#5BAED9";
let drawSize  = 4;

window.initCanvas = function() {
  const canvas = document.getElementById("drawCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width  = canvas.width;
    tmpCanvas.height = canvas.height;
    tmpCanvas.getContext("2d").drawImage(canvas, 0, 0);
    canvas.width  = rect.width;
    canvas.height = rect.height || 320;
    ctx.drawImage(tmpCanvas, 0, 0);
  }
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(canvas);

  const getPos = (e, touch) => {
    const r = canvas.getBoundingClientRect();
    const src = touch ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const draw = (x, y) => {
    if (!isDrawing) return;
    ctx.lineWidth = drawSize;
    ctx.lineCap   = "round";
    ctx.lineJoin  = "round";
    ctx.strokeStyle = drawColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  canvas.addEventListener("mousedown", e => {
    const p = getPos(e);
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener("mousemove", e => { const p = getPos(e); draw(p.x, p.y); });
  canvas.addEventListener("mouseup",   () => { isDrawing = false; });
  canvas.addEventListener("mouseleave",() => { isDrawing = false; });

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    const p = getPos(e, true);
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const p = getPos(e, true);
    draw(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener("touchend", () => { isDrawing = false; });
};

window.setColor = function(c) {
  drawColor = c;
  document.querySelectorAll(".color-dot").forEach(d => {
    const same = d.dataset.color === c || d.style.background === c;
    d.classList.toggle("selected", same);
    d.setAttribute("aria-checked", String(same));
  });
};
window.setSize = function(s) {
  drawSize = s;
  const sizes = [4, 10, 20];
  document.querySelectorAll(".size-btn").forEach((b, i) => {
    b.classList.toggle("active",   sizes[i] === s);
    b.setAttribute("aria-pressed", String(sizes[i] === s));
  });
};
window.clearCanvas = function() {
  const c = document.getElementById("drawCanvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
};

// ════════════════════════════════════════════════════════════
//  12. AVATAR / INTERESSES (REGISTRO)
// ════════════════════════════════════════════════════════════
function renderAvatarGrid() {
  const g = document.getElementById("avatarGrid");
  if (!g) return;
  g.innerHTML = AVATARS.map(a => `
    <button type="button" class="avatar-option" data-avatar="${a.id}"
      role="radio" aria-checked="false" aria-label="${a.label}" title="${a.label}"
      onclick="selectAvatar('${a.id}')">
      <span aria-hidden="true">${a.emoji}</span>
    </button>`).join("");
}
window.selectAvatar = function(id) {
  selectedAvatar = id;
  document.querySelectorAll(".avatar-option").forEach(b => {
    const sel = b.dataset.avatar === id;
    b.classList.toggle("selected", sel);
    b.setAttribute("aria-checked", String(sel));
  });
  // Atualiza preview
  const prev = document.getElementById("avatarPreview");
  if (prev) prev.textContent = AVATAR_MAP[id] ?? "🦊";
};

function renderInterestsGrid() {
  const g = document.getElementById("interestsGrid");
  if (!g) return;
  g.innerHTML = INTERESTS_LIST.map(i => `
    <button type="button" class="tag" data-interest="${i.id}"
      role="checkbox" aria-checked="false" aria-label="${i.label}"
      onclick="toggleInterest('${i.id}')">
      <span aria-hidden="true">${i.emoji}</span> ${i.label}
    </button>`).join("");
}
window.toggleInterest = function(id) {
  const btn = document.querySelector(`[data-interest="${id}"]`);
  if (selectedInterests.includes(id)) {
    selectedInterests = selectedInterests.filter(i => i !== id);
    btn?.classList.remove("active");
    btn?.setAttribute("aria-checked", "false");
  } else {
    if (selectedInterests.length >= MAX_INTERESTS) {
      showToast(`Máximo ${MAX_INTERESTS} interesses! 🌈`, "warning");
      return;
    }
    selectedInterests.push(id);
    btn?.classList.add("active");
    btn?.setAttribute("aria-checked", "true");
  }
};
window.setComfortLevel = function(level) {
  selectedComfort = level;
  ["low","med","high"].forEach(l => {
    const b = document.getElementById(`comfort-${l}`);
    const a = l === level || (level === "medium" && l === "med");
    b?.classList.toggle("active", a);
    b?.setAttribute("aria-checked", String(a));
  });
};

// ════════════════════════════════════════════════════════════
//  13. CARREGA UI COM DADOS REAIS DO FIRESTORE
// ════════════════════════════════════════════════════════════
async function loadUserUI(user) {
  try {
    const data = await window.fetchCurrentUserDoc();
    if (!data) return;

    const em = AVATAR_MAP[data.avatar] ?? "🦊";

    // Avatar em todas as páginas
    document.querySelectorAll(".nav-avatar, .dash-avatar-lg, .profile-avatar").forEach(el => {
      el.textContent = em;
    });

    // Saudação
    const g = document.getElementById("dashGreeting");
    if (g) g.textContent = `Olá, ${data.displayName}! 🌟`;

    // Perfil completo
    const pName = document.querySelector(".profile-name");
    if (pName) pName.textContent = data.displayName;

    const pAvatar = document.querySelector(".profile-avatar");
    if (pAvatar) pAvatar.textContent = em;

    // Tags de interesses
    const pTags = document.getElementById("profileInterestTags");
    if (pTags && data.interests?.length) {
      pTags.innerHTML = data.interests.map(id => {
        const int = INTERESTS_LIST.find(i => i.id === id);
        return int ? `<span class="profile-tag">${int.emoji} ${int.label}</span>` : "";
      }).join("");
    }

    // Nível de conforto
    const pComfort = document.getElementById("profileComfort");
    if (pComfort) {
      const levels = { low:"🌱 Baixo", medium:"🌿 Médio", high:"🌳 Alto" };
      pComfort.textContent = levels[data.comfortLevel] ?? "🌱 Baixo";
    }

    // Estatísticas
    const stats = data.stats ?? { sessions: 0, friends: 0, achievements: 3, streak: 1 };
    [["statSessions",stats.sessions],["statFriends",stats.friends],
     ["statAchievements",stats.achievements],["statStreak",stats.streak]
    ].forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? 0;
    });

    // Settings: sincroniza toggles com Firestore (se existirem campos)
  } catch(e) { /* silencia erros não críticos */ }
}

// ════════════════════════════════════════════════════════════
//  14. TIMER (JOGOS)
// ════════════════════════════════════════════════════════════
window.startTimer = function(seconds) {
  const d = document.getElementById("timerDisplay");
  if (!d) return;
  let r = seconds;
  const fmt = n => Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
  d.textContent = fmt(r);
  const iv = setInterval(() => {
    r--;
    d.textContent = fmt(r);
    if (r <= 30) d.style.color = "var(--peach-deep)";
    if (r <= 0) {
      clearInterval(iv);
      showToast("Sessão encerrada! Ótima participação! 🌟", "success");
      setTimeout(() => window.location.href = "dashboard.html", 2500);
    }
  }, 1000);
};

// ════════════════════════════════════════════════════════════
//  15. HELPERS DE FORMULÁRIO
// ════════════════════════════════════════════════════════════
function setButtonLoading(btn, loading, text = "Aguarde…") {
  if (!btn) return;
  if (loading) {
    btn._orig    = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${text}`;
    btn.disabled  = true;
  } else {
    btn.innerHTML = btn._orig ?? btn.innerHTML;
    btn.disabled  = false;
  }
}
function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("input-error");
  el.setAttribute("aria-invalid", "true");
  let e = document.getElementById(`${id}-error`);
  if (!e) {
    e = document.createElement("p");
    e.id        = `${id}-error`;
    e.className = "field-error";
    e.setAttribute("role", "alert");
    el.parentNode.appendChild(e);
  }
  e.textContent = msg;
}
function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove("input-error"); el.removeAttribute("aria-invalid"); }
  const e = document.getElementById(`${id}-error`);
  if (e) e.textContent = "";
}

// ════════════════════════════════════════════════════════════
//  16. UTILITÁRIOS
// ════════════════════════════════════════════════════════════
function translateAuthError(code) {
  const m = {
    "auth/email-already-in-use":  "E-mail já cadastrado.",
    "auth/invalid-email":         "E-mail inválido.",
    "auth/weak-password":         "Senha fraca (mínimo 6 caracteres).",
    "auth/user-not-found":        "Conta não encontrada.",
    "auth/wrong-password":        "Senha incorreta.",
    "auth/invalid-credential":    "E-mail ou senha incorretos.",
    "auth/too-many-requests":     "Muitas tentativas. Tente mais tarde.",
    "auth/network-request-failed":"Sem conexão. Verifique sua internet.",
    "auth/popup-blocked":         "Pop-up bloqueado. Permita para este site.",
  };
  return m[code] ?? "Erro inesperado. Tente novamente.";
}
function gerarNomeAnonimo() {
  const a = ["Calmo","Curioso","Sereno","Gentil","Alegre"];
  const b = ["Gato","Panda","Raposa","Coelho","Urso"];
  return `${a[Math.random()*a.length|0]}${b[Math.random()*b.length|0]}${100+(Math.random()*900|0)}`;
}

// ════════════════════════════════════════════════════════════
//  17. APLICA CONFIGURAÇÕES SALVAS
// ════════════════════════════════════════════════════════════
function applyStoredSettings() {
  const theme = localStorage.getItem("theme") ?? "light";
  document.documentElement.dataset.theme = theme;
  syncThemeButtons(theme);

  if (localStorage.getItem("sensory")  === "true") document.body.classList.add("sensory-mode");
  if (localStorage.getItem("contrast") === "true") document.body.classList.add("high-contrast");
  if (localStorage.getItem("dyslexia") === "true") document.body.classList.add("dyslexia-font");
  if (localStorage.getItem("motion")   === "true") document.body.classList.add("reduce-motion");

  const fs = localStorage.getItem("fontSize");
  if (fs) document.documentElement.style.fontSize = fs + "px";

  // Sincroniza checkboxes de settings
  ["sensory","contrast","dyslexia","motion"].forEach(key => {
    const on = localStorage.getItem(key) === "true";
    document.querySelectorAll(`[data-setting="${key}"]`).forEach(el => {
      if (el.type === "checkbox") el.checked = on;
    });
  });

  const disp = document.getElementById("fontSizeDisplay");
  if (disp) disp.textContent = (fs ?? "18") + "px";
}

// ════════════════════════════════════════════════════════════
//  18. INICIALIZAÇÃO
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  applyStoredSettings();
  initLoader();
  registerSW();

  const page = document.body.dataset.page;

  // Keyboard trap para modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeComfort();
  });

  if (page === "register") {
    renderAvatarGrid();
    renderInterestsGrid();
    setComfortLevel("low");
    document.getElementById("regEmail")?.addEventListener("input", function() {
      const pg = document.getElementById("passGroup");
      if (pg) pg.style.display = this.value.trim() ? "block" : "none";
    });
  }

  if (page === "dashboard") {
    renderGamesGrid("dashGames", 3);
    renderFriendsList();
  }

  if (page === "games") {
    renderGamesGrid("allGamesGrid");
  }

  if (page === "achievements") {
    renderAchievementsList();
  }

  if (page === "draw-game") {
    initCanvas();
    startTimer(5 * 60);
    addChatMessage("Foxy IA 🦊", "Olá! Vamos criar um desenho incrível juntos! 🎨", false);
  }

  if (page === "story-game") {
    startTimer(3 * 60);
    addChatMessage("Foxy IA 🦊", "Vamos criar uma história juntos! Você começa 🌟", false);
  }

  if (page === "quiz-game") {
    startTimer(3 * 60);
  }

  if (page === "puzzle-game") {
    startTimer(4 * 60);
  }

  if (page === "emoji-game") {
    startTimer(2 * 60);
  }

  if (page === "login") {
    document.getElementById("loginPass")?.addEventListener("keydown", e => {
      if (e.key === "Enter") loginWithEmail();
    });
  }
});
