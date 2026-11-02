"use strict";

(() => {
  const user = GameHub.requireLogin();
  if (!user) return;

  const GAME_TITLE = "Burung Terbang";

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const formatDate = (iso) => {
    if (!iso) return "Belum pernah";
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  setText("who", user.nama.split(" ")[0]);
  const profileText = document.querySelector(".profile p");
  if (profileText && profileText.firstChild) {
    profileText.firstChild.textContent = user.nama;
  }

  const loginMark = document.querySelector(".notice mark");
  if (loginMark && !GameHub.consumeFreshLogin()) {
    loginMark.hidden = true;
  }


  const statsList = document.querySelector("dl.stats");
  const extraRows = {};
  if (statsList) {
    [
      ["lastscore", "Skor terakhir"],
      ["lastplayed", "Terakhir main"],
    ].forEach(([id, label]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.id = `stat-${id}`;
      statsList.append(dt, dd);
      extraRows[id] = dd;
    });
  }

  const renderStats = () => {
    const save = GameHub.loadSave(user.username);
    setText("lvl", save.level);
    setText("best", save.best);
    setText("played", save.played);
    if (extraRows.lastscore)
      extraRows.lastscore.textContent = save.played ? save.lastScore : "-";
    if (extraRows.lastplayed)
      extraRows.lastplayed.textContent = formatDate(save.lastPlayed);
  };
  renderStats();

  window.addEventListener("pageshow", renderStats);

  const profileWidget = document.querySelector(".profile");
  if (profileWidget && profileWidget.parentElement) {
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "btn ghost block";
    resetButton.style.marginTop = "0.8rem";
    resetButton.innerHTML =
      '<i class="bi bi-arrow-counterclockwise"></i>Reset progres';
    resetButton.addEventListener("click", () => {
      if (
        window.confirm(
          "Hapus semua progres game (skor, level, jumlah main)? Akun tetap ada.",
        )
      ) {
        GameHub.resetSave(user.username);
        renderStats();
      }
    });
    profileWidget.parentElement.append(resetButton);
  }

  const logoutLinks = document.querySelectorAll(
    "#loqout, .drawer-foot a[href='index.html']",
  );
  logoutLinks.forEach((link) => {
    link.addEventListener("click", () => {
      GameHub.logout();
    });
  });

  const query = (
    new URLSearchParams(window.location.search).get("q") || ""
  ).trim();
  if (query) {
    document.querySelectorAll('input[type="search"]').forEach((input) => {
      input.value = query;
    });

    const card = document.querySelector(".games .card");
    const found = GAME_TITLE.toLowerCase().includes(query.toLowerCase());
    if (card && !found) {
      card.hidden = true;
      const notice = document.querySelector(".notice");
      if (notice) {
        notice.textContent = `Game "${query}" tidak ditemukan. Yang tersedia: ${GAME_TITLE}.`;
      }
    }
  }
})();
