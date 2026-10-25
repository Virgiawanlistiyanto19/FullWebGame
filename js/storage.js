"use strict";

/*
 * storage.js
 * Pusat semua urusan data Game Hub X-RPL 2 yang disimpan di localStorage:
 *   - akun pengguna (register & login)
 *   - sesi login (siapa yang sedang masuk)
 *   - save game per akun (skor terbaik, level, jumlah main, dst.)
 *
 * Dimuat lebih dulu dari file JS lain, lalu dipakai lewat objek GameHub.
 */
const GameHub = (() => {
  const KEY_USERS = "gamehub_users";
  const KEY_SESSION = "gamehub_session";
  const KEY_SAVE_PREFIX = "gamehub_save_";
  const KEY_FRESH_LOGIN = "gamehub_fresh_login";
  const SKOR_PER_LEVEL = 20;
  const MAX_HISTORY = 5;

  // ---------- helper localStorage ----------
  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };

  // ---------- password ----------
  const hashPassword = async (username, password) => {
    const text = `gamehub:${username.toLowerCase()}:${password}`;
    if (window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(text);
      const buffer = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    // cadangan kalau browser tidak mendukung crypto.subtle
    return `b64:${btoa(unescape(encodeURIComponent(text)))}`;
  };

  // ---------- akun ----------
  const getUsers = () => readJSON(KEY_USERS, []);

  const findUser = (username) => {
    const target = String(username).trim().toLowerCase();
    return getUsers().find((user) => user.username.toLowerCase() === target) || null;
  };

  const register = async ({ nama, username, email, password }) => {
    const users = getUsers();
    const usernameLower = username.trim().toLowerCase();
    const emailLower = email.trim().toLowerCase();

    if (users.some((user) => user.username.toLowerCase() === usernameLower)) {
      return { ok: false, error: "Username sudah dipakai, coba yang lain." };
    }
    if (users.some((user) => user.email.toLowerCase() === emailLower)) {
      return { ok: false, error: "Email ini sudah terdaftar." };
    }

    users.push({
      nama: nama.trim(),
      username: username.trim(),
      email: email.trim(),
      passwordHash: await hashPassword(username, password),
      createdAt: new Date().toISOString(),
    });

    if (!writeJSON(KEY_USERS, users)) {
      return { ok: false, error: "Gagal menyimpan akun. Penyimpanan browser penuh atau diblokir." };
    }
    return { ok: true };
  };

  const login = async (username, password) => {
    const user = findUser(username);
    if (!user) {
      return { ok: false, error: "Username atau password salah." };
    }
    const hash = await hashPassword(user.username, password);
    if (hash !== user.passwordHash) {
      return { ok: false, error: "Username atau password salah." };
    }
    try {
      localStorage.setItem(KEY_SESSION, user.username);
      sessionStorage.setItem(KEY_FRESH_LOGIN, "1");
    } catch (error) {
      return { ok: false, error: "Gagal menyimpan sesi login. Cek pengaturan browser kamu." };
    }
    return { ok: true, user };
  };

  const currentUser = () => {
    let username = null;
    try {
      username = localStorage.getItem(KEY_SESSION);
    } catch (error) {
      return null;
    }
    return username ? findUser(username) : null;
  };

  const logout = () => {
    try {
      localStorage.removeItem(KEY_SESSION);
      sessionStorage.removeItem(KEY_FRESH_LOGIN);
    } catch (error) {
      // abaikan
    }
  };

  // true hanya sekali setelah login berhasil (untuk pesan "Login berhasil")
  const consumeFreshLogin = () => {
    try {
      const fresh = sessionStorage.getItem(KEY_FRESH_LOGIN) === "1";
      sessionStorage.removeItem(KEY_FRESH_LOGIN);
      return fresh;
    } catch (error) {
      return false;
    }
  };

  // Dipanggil di halaman yang wajib login (dashboard, game).
  const requireLogin = () => {
    const user = currentUser();
    if (!user) {
      window.location.replace("login.html");
      return null;
    }
    return user;
  };

  // Dipanggil di login/register: kalau sudah login langsung ke dashboard.
  const redirectIfLoggedIn = () => {
    if (currentUser()) {
      window.location.replace("dashboard.html");
      return true;
    }
    return false;
  };

  // ---------- save game ----------
  const defaultSave = () => ({
    level: 1,
    best: 0,
    played: 0,
    totalScore: 0,
    lastScore: 0,
    lastPlayed: null,
    history: [],
  });

  const saveKey = (username) => KEY_SAVE_PREFIX + username.toLowerCase();

  const levelFromTotal = (totalScore) => Math.floor(totalScore / SKOR_PER_LEVEL) + 1;

  const loadSave = (username) => {
    const stored = readJSON(saveKey(username), null);
    return { ...defaultSave(), ...(stored || {}) };
  };

  const writeSave = (username, data) => writeJSON(saveKey(username), data);

  // Catat satu ronde permainan lalu simpan otomatis.
  const recordGame = (username, score) => {
    const save = loadSave(username);
    const levelBefore = save.level;
    const newBest = score > save.best;

    save.played += 1;
    save.totalScore += score;
    save.lastScore = score;
    save.lastPlayed = new Date().toISOString();
    save.best = Math.max(save.best, score);
    save.level = levelFromTotal(save.totalScore);
    save.history = [score, ...save.history].slice(0, MAX_HISTORY);

    const saved = writeSave(username, save);
    return { save, newBest, levelUp: save.level > levelBefore, saved };
  };

  const resetSave = (username) => {
    try {
      localStorage.removeItem(saveKey(username));
    } catch (error) {
      // abaikan
    }
  };

  const escapeHTML = (text) =>
    String(text).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  return {
    SKOR_PER_LEVEL,
    register,
    login,
    logout,
    currentUser,
    consumeFreshLogin,
    requireLogin,
    redirectIfLoggedIn,
    loadSave,
    recordGame,
    resetSave,
    escapeHTML,
  };
})();
