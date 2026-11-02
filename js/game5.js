"use strict";

(() => {
  const user = GameHub.requireLogin();
  if (!user) return;

  const stage = document.querySelector(".stage");
  const bird = stage.querySelector(".anak-ayam-1");
  const bigScore = stage.querySelector(".skor-besar");
  const hud = stage.querySelector(".hud");
  const help = stage.querySelector(".help");

  const pipes = ["p1", "p2"].map((name) => ({
    top: stage.querySelector(`.pipa.${name}.atas`),
    bottom: stage.querySelector(`.pipa.${name}.bawah`),
    x: 2, 
    gapTop: 0.3,
    gap: 0.3,
    scored: false,
  }));

  const MAX_LIVES = 3;
  const GROUND_RATIO = 0.88; 
  const GRAVITY = 2.6;
  const FLAP_SPEED = -0.78; 
  const BIRD_X_RATIO = 0.3;
  const BASE_SPEED = 0.45;
  const RESTART_DELAY = 600; 

  let state = "ready"; 
  let score = 0;
  let lives = MAX_LIVES;
  let birdY = 0.5;
  let birdV = 0;
  let lastCenter = 0.5;
  let lastTime = 0;
  let overAt = 0;
  let recorded = true; 
  let save = GameHub.loadSave(user.username);


  let W = 0;
  let H = 0;
  let unit = 0;
  let groundY = 0;
  let birdX = 0;
  let hitW = 0;
  let hitH = 0;
  let pipeW = 0;

  const measure = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    unit = Math.min(W, H);
    groundY = H * GROUND_RATIO;
    birdX = W * BIRD_X_RATIO;
    const birdW = bird.offsetWidth || unit * 0.16;
    const birdH = bird.offsetHeight || birdW * 0.7;
    hitW = birdW * 0.6;
    hitH = birdH * 0.6;
    pipeW = pipes[0].top.offsetWidth || unit * 0.12;
  };

  const currentGap = () => {
    const birdH = bird.offsetHeight || (bird.offsetWidth || unit * 0.16) * 0.7;
    return Math.max(0.28, (birdH * 2.9) / H);
  };

  const renderHud = () => {
    const best = Math.max(save.best, score);
    bigScore.textContent = score;
    hud.innerHTML =
      `Lv <b>${save.level}</b> &nbsp; Skor <b>${score}</b> &nbsp; ` +
      `Terbaik <b>${best}</b> &nbsp; ❤️${lives}`;
  };

  const renderPipes = () => {
    pipes.forEach((pipe) => {
      const left = `${pipe.x * W}px`;
      const gapTopPx = pipe.gapTop * H;
      const gapBottomPx = (pipe.gapTop + pipe.gap) * H;
      pipe.top.style.left = left;
      pipe.bottom.style.left = left;
      pipe.top.style.height = `${gapTopPx}px`;
      pipe.bottom.style.height = `${Math.max(0, groundY - gapBottomPx)}px`;
    });
  };

  const renderBird = () => {
    const angle = Math.max(-25, Math.min(70, birdV * 55));
    bird.style.left = `${birdX}px`;
    bird.style.top = `${birdY * H}px`;
    bird.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
  };

  const releaseBird = () => {
    // kembalikan ke posisi & animasi melayang bawaan CSS
    bird.style.left = "";
    bird.style.top = "";
    bird.style.transform = "";
    bird.style.animation = "";
  };

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.hidden = true;
  stage.append(overlay);

  const showOverlay = (html) => {
    overlay.innerHTML = html;
    overlay.hidden = false;
  };
  const hideOverlay = () => {
    overlay.hidden = true;
  };

  const showReady = (title, text) => {
    showOverlay(
      `<div class="panel"><h2>${title}</h2><p>${text}</p>` +
        `<p class="kecil">Halo, ${GameHub.escapeHTML(user.nama)}!</p></div>`,
    );
  };

  const showGameOver = (result) => {
    const badges = [];
    if (result.newBest) badges.push("🏆 Rekor baru!");
    if (result.levelUp) badges.push(`⭐ Naik ke level ${result.save.level}!`);
    showOverlay(
      `<div class="panel"><h2>Game Over</h2>` +
        `<p class="angka">${score}</p>` +
        `<p>Skor terbaik <b>${result.save.best}</b> &middot; Level <b>${result.save.level}</b></p>` +
        (badges.length
          ? `<p class="badge">${badges.join(" &nbsp; ")}</p>`
          : "") +
        `<p class="kecil">${
          result.saved
            ? "Progres tersimpan otomatis di akunmu."
            : "Progres gagal disimpan (penyimpanan browser diblokir)."
        }</p>` +
        `<div class="aksi">` +
        `<button type="button" class="btn-game" data-act="again">Main Lagi</button>` +
        `<a class="btn-game ghost" href="dashboard.html">Dashboard</a>` +
        `</div></div>`,
    );
  };

  const resetPipes = () => {
    const spacing = Math.max(0.5, (unit * 0.42) / W);
    pipes.forEach((pipe, index) => {
      pipe.x = 0.85 + index * spacing;
      pipe.scored = false;
      pipe.gap = currentGap();
      pipe.gapTop = nextGapTop(pipe.gap);
    });
  };

  const nextGapTop = (gap) => {
    const margin = 0.12;
    const minCenter = margin + gap / 2;
    const maxCenter = GROUND_RATIO - margin - gap / 2;
    const shift = (Math.random() - 0.5) * 2 * 0.3;
    const center = Math.min(maxCenter, Math.max(minCenter, lastCenter + shift));
    lastCenter = center;
    return center - gap / 2;
  };

  const placeReady = () => {
    birdY = 0.5;
    birdV = 0;
    releaseBird();
    renderPipes();
    renderHud();
  };

  const newGame = () => {
    measure();
    score = 0;
    lives = MAX_LIVES;
    lastCenter = 0.5;
    save = GameHub.loadSave(user.username);
    state = "ready";
    recorded = true;
    resetPipes();
    placeReady();
    showReady(
      "Siap?",
      "Tekan spasi, panah atas, atau ketuk layar untuk mulai.",
    );
  };

  const flap = () => {
    birdV = FLAP_SPEED;
  };

  const startPlaying = () => {
    state = "playing";
    recorded = false;
    hideOverlay();
    bird.style.animation = "none";
    lastTime = performance.now();
    flap();
    renderBird();
    window.requestAnimationFrame(loop);
  };

  const finishRound = () => {
    if (recorded) return null;
    recorded = true;
    const result = GameHub.recordGame(user.username, score);
    save = result.save;
    return result;
  };

  const loseLife = () => {
    lives -= 1;
    stage.classList.remove("kena");
    void stage.offsetWidth; // restart animasi kilat
    stage.classList.add("kena");

    if (lives > 0) {
      state = "ready";
      lastCenter = 0.5;
      resetPipes();
      placeReady();
      showReady(
        "Kena!",
        `Sisa nyawa ❤️${lives}. Tekan spasi atau ketuk layar untuk lanjut.`,
      );
      return;
    }

    state = "over";
    overAt = performance.now();
    renderHud();
    const result = finishRound();
    renderHud();
    showGameOver(
      result || { save, newBest: false, levelUp: false, saved: true },
    );
  };

  const hitTest = () => {
    const centerY = birdY * H;
    const left = birdX - hitW / 2;
    const right = birdX + hitW / 2;
    const top = centerY - hitH / 2;
    const bottom = centerY + hitH / 2;

    if (bottom >= groundY) return true;

    return pipes.some((pipe) => {
      const pipeLeft = pipe.x * W - pipeW * 0.04;
      const pipeRight = pipe.x * W + pipeW * 1.04;
      if (right <= pipeLeft || left >= pipeRight) return false;
      return top < pipe.gapTop * H || bottom > (pipe.gapTop + pipe.gap) * H;
    });
  };

  const update = (dt) => {
    // burung
    birdV += GRAVITY * dt;
    birdY += birdV * dt;
    const ceiling = hitH / 2 / H;
    if (birdY < ceiling) {
      birdY = ceiling;
      birdV = Math.max(birdV, 0);
    }

    const speed = unit * BASE_SPEED * (1 + Math.min(score, 40) * 0.01);
    const spacing = Math.max(0.5, (unit * 0.42) / W);
    pipes.forEach((pipe) => {
      pipe.x -= (speed * dt) / W;
    });
    pipes.forEach((pipe, index) => {
      if (pipe.x * W < -pipeW * 1.3) {
        const other = pipes[1 - index];
        pipe.x = Math.max(other.x, 1) + spacing;
        pipe.gap = currentGap();
        pipe.gapTop = nextGapTop(pipe.gap);
        pipe.scored = false;
      }
      if (!pipe.scored && pipe.x * W + pipeW < birdX - hitW / 2) {
        pipe.scored = true;
        score += 1;
        renderHud();
      }
    });
  };

  const loop = (now) => {
    if (state !== "playing") return;
    const dt = Math.min((now - lastTime) / 1000, 0.04);
    lastTime = now;

    update(dt);
    renderPipes();
    renderBird();

    if (hitTest()) {
      loseLife();
      return;
    }
    window.requestAnimationFrame(loop);
  };

  const handleAction = () => {
    if (state === "ready") {
      startPlaying();
    } else if (state === "playing") {
      flap();
    } else if (state === "over" && performance.now() - overAt > RESTART_DELAY) {
      newGame();
    }
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      if (!event.repeat) handleAction();
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) return;
    if (state === "over") return; // game over: pakai tombol
    handleAction();
  });

  overlay.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act='again']");
    if (button) newGame();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") {
      state = "ready";
      showReady("Dijeda", "Tekan spasi atau ketuk layar untuk lanjut.");
    }
  });

  window.addEventListener("pagehide", () => {
    if (!recorded && score > 0) finishRound();
  });

  window.addEventListener("resize", () => {
    measure();
    renderPipes();
    if (state === "playing") renderBird();
  });

  if (help) help.hidden = false;
  newGame();
})();
