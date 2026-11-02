"use strict";

(() => {
  if (GameHub.redirectIfLoggedIn()) return;

  const msg = document.getElementById("msg");
  const COLOR_ERROR = "#ff8aa5";
  const COLOR_OK = "#7dffb0";

  const showMessage = (text, isError = true) => {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isError ? COLOR_ERROR : COLOR_OK;
  };

  const setBusy = (form, busy) => {
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = busy;
  };

  const regForm = document.getElementById("regForm");
  if (regForm) {
    regForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showMessage("");

      const nama = regForm.nama.value.trim();
      const username = regForm.username.value.trim();
      const email = regForm.email.value.trim();
      const password = regForm.password.value;
      const konfirmasi = regForm.konfirmasi.value;

      if (nama.length < 2) {
        showMessage("Nama lengkap minimal 2 karakter.");
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showMessage("Username 3-20 karakter: huruf, angka, atau garis bawah (_).");
        return;
      }
      if (password.length < 6) {
        showMessage("Password minimal 6 karakter.");
        return;
      }
      if (password !== konfirmasi) {
        showMessage("Konfirmasi password tidak sama.");
        return;
      }

      setBusy(regForm, true);
      const result = await GameHub.register({ nama, username, email, password });
      if (!result.ok) {
        showMessage(result.error);
        setBusy(regForm, false);
        return;
      }

      showMessage("Akun berhasil dibuat! Mengarahkan ke halaman login...", false);
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    });
  }

  const loginForm = document.getElementById("loginform");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showMessage("");

      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;
      if (!username || !password) {
        showMessage("Username dan password wajib diisi.");
        return;
      }

      setBusy(loginForm, true);
      const result = await GameHub.login(username, password);
      if (!result.ok) {
        showMessage(result.error);
        setBusy(loginForm, false);
        return;
      }

      showMessage("Login berhasil! Masuk ke dashboard...", false);
      window.location.href = "dashboard.html";
    });
  }
})();
