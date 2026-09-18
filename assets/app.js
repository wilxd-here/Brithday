/* =========================================================
   ZaamMovie — Frontend logic
   Backend: /.netlify/functions/zaam-movies (alias: /api/movies)
   ========================================================= */

const API = "/.netlify/functions/zaam-movies";
const PLACEHOLDER_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#161923"/><text x="50%" y="50%" fill="#5c6070" font-family="monospace" font-size="16" text-anchor="middle">ZaamMovie</text></svg>`
  );
const PLACEHOLDER_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#1e2230"/><circle cx="60" cy="46" r="22" fill="#5c6070"/><path d="M20 108c4-26 26-40 40-40s36 14 40 40" fill="#5c6070"/></svg>`
  );

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------------- Proteksi gambar (anti long-press / save / drag) ---------------- */
document.addEventListener("contextmenu", (e) => {
  if (e.target && e.target.tagName === "IMG") e.preventDefault();
});
document.addEventListener("dragstart", (e) => {
  if (e.target && e.target.tagName === "IMG") e.preventDefault();
});

/* ---------------- Top loading bar ---------------- */
const topload = $("#topload");
let pendingCalls = 0;
function loaderStart() {
  pendingCalls++;
  topload.classList.add("active");
  topload.style.width = "70%";
}
function loaderDone() {
  pendingCalls = Math.max(0, pendingCalls - 1);
  if (pendingCalls === 0) {
    topload.style.width = "100%";
    setTimeout(() => {
      topload.classList.remove("active");
      topload.style.width = "0%";
    }, 260);
  }
}

/* ---------------- Toast ---------------- */
const toastEl = $("#toast");
let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ---------------- Normalizer -----------------
   Sumber data adalah hasil scraping pihak ketiga, jadi nama field
   bisa bervariasi. Fungsi ini mencoba beberapa kemungkinan nama field
   supaya UI tetap tampil walau struktur data sedikit berbeda. */
function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pick = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
    }
    return undefined;
  };
  const title = pick("title", "judul", "name", "nama") || "Tanpa Judul";
  const poster = pick("poster", "image", "thumbnail", "img", "cover") || PLACEHOLDER_POSTER;
  const rating = pick("rating", "score", "vote_average", "nilai");
  const type = pick("type", "tipe", "category") || "movie";
  const year = pick("year", "tahun", "release_date", "date");
  const slug = pick("slug", "id", "url", "link", "href");
  const synopsis = pick("synopsis", "sinopsis", "description", "deskripsi", "overview") || "Sinopsis belum tersedia untuk judul ini.";
  const genre = pick("genre", "genres", "kategori");
  const duration = pick("duration", "durasi", "runtime");
  const backdrop = pick("backdrop", "banner", "background") || poster;

  return { title, poster, rating, type, year, slug, synopsis, genre, duration, backdrop, _raw: raw };
}

function extractList(payload) {
  if (!payload) return [];
  const r = payload.results !== undefined ? payload.results : payload;
  if (Array.isArray(r)) return r.map(normalizeItem).filter(Boolean);
  if (r && Array.isArray(r.data)) return r.data.map(normalizeItem).filter(Boolean);
  if (r && Array.isArray(r.movies)) return r.movies.map(normalizeItem).filter(Boolean);
  if (r && typeof r === "object") {
    // single-object detail response
    const norm = normalizeItem(r);
    return norm ? [norm] : [];
  }
  return [];
}

async function apiCall(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  loaderStart();
  try {
    const res = await fetch(`${API}?${qs}`);
    const json = await res.json().catch(() => null);
    return json;
  } catch (err) {
    return { status: false, code: 0, message: "Tidak dapat terhubung ke server." };
  } finally {
    loaderDone();
  }
}

/* ---------------- Rendering ---------------- */

function starIcon() {
  return `<svg class="icon icon-sm" style="width:11px;height:11px"><use href="#ic-star"/></svg>`;
}

function cardHTML(item, idx) {
  const ratingBadge = item.rating
    ? `<div class="card-rating">${starIcon()}${item.rating}</div>`
    : "";
  return `
  <div class="card" data-slug="${encodeURIComponent(item.slug || "")}" data-idx="${idx}">
    <div class="card-frame">
      <img src="${item.poster}" alt="Poster ${escapeHTML(item.title)}" loading="lazy"
           draggable="false" oncontextmenu="return false"
           onerror="this.src='${PLACEHOLDER_POSTER}'"/>
      ${ratingBadge}
      <div class="card-play"><svg class="icon"><use href="#ic-play"/></svg></div>
    </div>
    <div class="card-title">${escapeHTML(item.title)}</div>
    <div class="card-type">${escapeHTML(item.type)}${item.year ? " · " + escapeHTML(String(item.year)) : ""}</div>
  </div>`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function skeletonRow(container, count = 6) {
  container.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton skel-card"></div>`)
    .join("");
}

function renderList(container, items, { onRetry = null } = {}) {
  if (!items.length) {
    container.innerHTML = `
      <div class="state-block" style="grid-column:1/-1">
        <svg class="icon"><use href="#ic-film"/></svg>
        <div class="state-title">Belum ada data</div>
        <div class="state-sub">Data tidak ditemukan atau sumber sedang tidak dapat diakses. Coba lagi beberapa saat lagi.</div>
        ${onRetry ? `<button class="state-retry" id="retryBtn-${container.id}">Coba lagi</button>` : ""}
      </div>`;
    if (onRetry) {
      const btn = $(`#retryBtn-${container.id}`);
      if (btn) btn.addEventListener("click", onRetry);
    }
    return;
  }
  container.innerHTML = items.map((it, i) => cardHTML(it, i)).join("");
  $$(".card", container).forEach((card, i) => {
    card.addEventListener("click", () => openFilmPage(items[i]));
  });
}

/* ---------------- Hero ---------------- */

const HERO_ROTATE_MS = 6500;
let heroItems = [];
let heroIndex = 0;
let heroTimer = null;

/* `items` = daftar beberapa film untuk dijadikan slide (maks 5), bukan cuma 1,
   supaya banner "Sedang Tayang" otomatis berganti gambar secara berkala. */
function renderHero(items) {
  const slot = $("#heroSlot");
  heroItems = (Array.isArray(items) ? items : [items]).filter(Boolean).slice(0, 5);
  clearInterval(heroTimer);

  if (!heroItems.length) {
    slot.innerHTML = "";
    return;
  }

  heroIndex = 0;
  const dotsHTML = heroItems.length > 1
    ? `<div class="hero-dots" id="heroDots">${heroItems
        .map((_, i) => `<button class="hero-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`)
        .join("")}</div>`
    : "";

  slot.innerHTML = `
    <div class="hero">
      <div class="hero-bg" id="heroBg"></div>
      <div class="hero-content" id="heroContentInner"></div>
      ${dotsHTML}
    </div>
  `;

  renderHeroSlide(0);

  $$(".hero-dot", slot).forEach((dot) => {
    dot.addEventListener("click", () => {
      goToHeroSlide(Number(dot.dataset.i));
      restartHeroTimer();
    });
  });

  restartHeroTimer();
}

function restartHeroTimer() {
  clearInterval(heroTimer);
  if (heroItems.length > 1) {
    heroTimer = setInterval(() => {
      goToHeroSlide((heroIndex + 1) % heroItems.length);
    }, HERO_ROTATE_MS);
  }
}

function goToHeroSlide(i) {
  heroIndex = i;
  renderHeroSlide(i);
  $$(".hero-dot").forEach((d, idx) => d.classList.toggle("active", idx === i));
}

function renderHeroSlide(i) {
  const item = heroItems[i];
  const bg = $("#heroBg");
  const contentInner = $("#heroContentInner");
  if (!item || !bg || !contentInner) return;

  // Fade halus saat gambar backdrop berganti
  bg.style.opacity = "0";
  setTimeout(() => {
    bg.style.backgroundImage = `url('${item.backdrop}')`;
    bg.style.opacity = "1";
  }, 220);

  contentInner.innerHTML = `
    <div class="hero-eyebrow"><span class="dot"></span> SEDANG TAYANG DI ZAAMMOVIE</div>
    <h1 class="hero-title">${escapeHTML(item.title)}</h1>
    <div class="hero-meta">
      ${item.rating ? `<span>${starIcon()} ${escapeHTML(String(item.rating))}</span>` : ""}
      ${item.year ? `<span><svg class="icon icon-sm"><use href="#ic-calendar"/></svg> ${escapeHTML(String(item.year))}</span>` : ""}
      ${item.type ? `<span><svg class="icon icon-sm"><use href="#ic-tag"/></svg> ${escapeHTML(item.type)}</span>` : ""}
    </div>
    <p class="hero-desc">${escapeHTML(truncate(item.synopsis, 190))}</p>
    <div class="hero-actions">
      <button class="btn btn-primary" id="heroPlayBtn"><svg class="icon icon-sm"><use href="#ic-play"/></svg> Tonton Sekarang</button>
      <button class="btn btn-ghost" id="heroInfoBtn"><svg class="icon icon-sm"><use href="#ic-info"/></svg> Info</button>
    </div>
  `;
  $("#heroPlayBtn").addEventListener("click", () => openFilmPage(item));
  $("#heroInfoBtn").addEventListener("click", () => openFilmPage(item));
}

function truncate(str, n) {
  str = String(str || "");
  return str.length > n ? str.slice(0, n).trim() + "…" : str;
}

/* ---------------- Navigation (path-based, mis. /search, /home) ---------------- */

const views = ["home", "search", "rekomendasi", "history", "info"];

function parseViewFromPath(pathname) {
  const seg = pathname.replace(/^\/+|\/+$/g, ""); // buang slash depan/belakang
  return views.includes(seg) ? seg : "home";
}

function goToView(name, { push = true } = {}) {
  if (!views.includes(name)) name = "home";

  views.forEach((v) => {
    $(`#view-${v}`).classList.toggle("active", v === name);
  });
  $("#view-detail").classList.remove("active");
  $("#view-watch").classList.remove("active");
  currentFilmSlug = null;
  currentWatchSlug = null;
  $$(".sb-link").forEach((el) => el.classList.toggle("active", el.dataset.view === name));
  $$(".bn-link").forEach((el) => el.classList.toggle("active", el.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  if (name === "rekomendasi" && !loadedFlags.rekomendasi) loadRekomendasi();
  if (name === "history") renderHistory();

  const targetPath = `/${name}`;
  if (push && location.pathname !== targetPath) {
    history.pushState({ view: name }, "", targetPath);
  } else if (!push && location.pathname !== targetPath) {
    history.replaceState({ view: name }, "", targetPath);
  }
}

$$(".sb-link, .bn-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (link.dataset.view === activeViewName()) return; // sudah di halaman ini
    goToView(link.dataset.view);
  });
});

function activeViewName() {
  const active = views.find((v) => $(`#view-${v}`).classList.contains("active"));
  return active || "home";
}

window.addEventListener("popstate", (e) => {
  routeCurrentLocation({ push: false });
});

function routeCurrentLocation({ push = true } = {}) {
  const filmMatch = location.pathname.match(/^\/film\/([^/]+)\/?$/);
  const watchMatch = location.pathname.match(/^\/nonton\/([^/]+)\/?$/);

  if (filmMatch) {
    const slug = decodeURIComponent(filmMatch[1]);
    const hist = getHistory().find((h) => h.slug === slug);
    const seed = hist || { slug, title: "Memuat...", poster: PLACEHOLDER_POSTER, backdrop: PLACEHOLDER_POSTER, synopsis: "" };
    currentFilmSlug = slug;
    currentWatchSlug = null;
    views.forEach((v) => $(`#view-${v}`).classList.remove("active"));
    $("#view-watch").classList.remove("active");
    $("#view-detail").classList.add("active");
    $$(".sb-link, .bn-link").forEach((el) => el.classList.remove("active"));
    renderDetailSkeleton(seed);
    loadFilmDetail(slug, seed);
  } else if (watchMatch) {
    const slug = decodeURIComponent(watchMatch[1]);
    const hist = getHistory().find((h) => h.slug === slug);
    const seed = hist || { slug, title: "Memuat...", poster: PLACEHOLDER_POSTER, backdrop: PLACEHOLDER_POSTER, synopsis: "" };
    currentWatchSlug = slug;
    currentFilmSlug = null;
    views.forEach((v) => $(`#view-${v}`).classList.remove("active"));
    $("#view-detail").classList.remove("active");
    $("#view-watch").classList.add("active");
    $$(".sb-link, .bn-link").forEach((el) => el.classList.remove("active"));
    renderWatchSkeleton(seed);
    loadWatchDetail(slug, seed);
  } else {
    goToView(parseViewFromPath(location.pathname), { push: false });
  }
}

/* ---------------- Data loading ---------------- */

const loadedFlags = { home: false, rekomendasi: false };

async function loadHome() {
  const rowUp = $("#rowUpcoming");
  const rowLatest = $("#rowLatest");
  const rowTop = $("#rowTopRated");
  skeletonRow(rowUp);
  skeletonRow(rowLatest);
  skeletonRow(rowTop);

  const [upcoming, latest, topRated] = await Promise.all([
    apiCall("upcoming"),
    apiCall("latest"),
    apiCall("top-rated"),
  ]);

  const upcomingList = extractList(upcoming);
  const latestList = extractList(latest);
  const topRatedList = extractList(topRated);

  renderList(rowUp, upcomingList, { onRetry: loadHome });
  renderList(rowLatest, latestList, { onRetry: loadHome });
  renderList(rowTop, topRatedList, { onRetry: loadHome });

  // Gabungkan beberapa film unggulan (rating tertinggi lebih diprioritaskan)
  // jadi slide-slide hero, supaya banner "Sedang Tayang" berganti otomatis.
  const heroSeen = new Set();
  const heroPicks = [];
  [...topRatedList, ...latestList, ...upcomingList].forEach((it) => {
    const key = it.slug || it.title;
    if (heroPicks.length < 5 && key && !heroSeen.has(key)) {
      heroSeen.add(key);
      heroPicks.push(it);
    }
  });
  renderHero(heroPicks);

  loadedFlags.home = true;
}

async function loadRekomendasi() {
  const grid = $("#rekomendasiGrid");
  skeletonRow(grid, 10);
  const popular = await apiCall("popular");
  renderList(grid, extractList(popular), { onRetry: loadRekomendasi });
  loadedFlags.rekomendasi = true;
}

let searchTimer = null;
function wireSearch(inputEl, resultsEl) {
  inputEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = inputEl.value.trim();
    if (!q) {
      resultsEl.innerHTML = `
        <div class="state-block" style="grid-column:1/-1">
          <svg class="icon"><use href="#ic-search"/></svg>
          <div class="state-title">Cari film favoritmu</div>
          <div class="state-sub">Ketik judul film atau series untuk mulai mencari di ZaamMovie.</div>
        </div>`;
      return;
    }
    skeletonRow(resultsEl, 8);
    searchTimer = setTimeout(async () => {
      const res = await apiCall("search", { q });
      renderList(resultsEl, extractList(res), { onRetry: () => inputEl.dispatchEvent(new Event("input")) });
    }, 420);
  });
}

/* ---------------- History (localStorage) ---------------- */

const HISTORY_KEY = "zaammovie_history";

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function pushHistory(item) {
  let hist = getHistory().filter((h) => h.slug !== item.slug || h.title !== item.title);
  hist.unshift({ ...item, _raw: undefined, watchedAt: Date.now() });
  hist = hist.slice(0, 40);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

function renderHistory() {
  const grid = $("#historyGrid");
  const hist = getHistory();
  if (!hist.length) {
    grid.innerHTML = `
      <div class="state-block" style="grid-column:1/-1">
        <svg class="icon"><use href="#ic-clock"/></svg>
        <div class="state-title">Belum ada riwayat</div>
        <div class="state-sub">Film yang kamu buka akan muncul di sini agar mudah ditemukan lagi.</div>
      </div>`;
    return;
  }
  grid.innerHTML = hist.map((it, i) => cardHTML(it, i)).join("");
  $$(".card", grid).forEach((card, i) => {
    card.addEventListener("click", () => openFilmPage(hist[i]));
  });
}

$("#btnClearHistory").addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("Riwayat tontonan dihapus");
});

/* ---------------- Detail page (halaman sendiri) ---------------- */

const detailContent = $("#detailContent");
const watchContent = $("#watchContent");
let currentFilmSlug = null;
let currentWatchSlug = null;

/* Normalizer khusus untuk hasil action=detail, mengikuti struktur asli API:
   { id, slug, type, title, poster, backdrop, rating, year, releaseDate,
     synopsis, tagline, duration, status, genres[], director, cast[],
     trailer, imdbId, numberOfSeasons, numberOfEpisodes, seasons[],
     stream: { primaryIframe, servers: [{ server, url }] } } */
function normalizeDetail(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pick = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
    }
    return undefined;
  };
  const stream = raw.stream && typeof raw.stream === "object" ? raw.stream : {};
  let servers = Array.isArray(stream.servers) ? stream.servers : [];
  if (!servers.length && Array.isArray(raw.servers)) servers = raw.servers;

  return {
    slug: pick("slug", "id"),
    type: pick("type", "tipe") || "Movie",
    title: pick("title", "judul", "name") || "Tanpa Judul",
    poster: pick("poster", "image") || PLACEHOLDER_POSTER,
    backdrop: pick("backdrop", "banner") || pick("poster", "image") || PLACEHOLDER_POSTER,
    rating: pick("rating", "score"),
    year: pick("year"),
    releaseDate: pick("releaseDate", "release_date"),
    synopsis: pick("synopsis", "sinopsis", "overview") || "Sinopsis belum tersedia untuk judul ini.",
    tagline: pick("tagline"),
    duration: pick("duration", "durasi", "runtime"),
    status: pick("status"),
    genres: Array.isArray(raw.genres) ? raw.genres : (Array.isArray(raw.genre) ? raw.genre : []),
    director: pick("director", "sutradara"),
    cast: Array.isArray(raw.cast) ? raw.cast.map(normalizeCastMember).filter(Boolean) : [],
    trailer: pick("trailer"),
    numberOfSeasons: pick("numberOfSeasons"),
    numberOfEpisodes: pick("numberOfEpisodes"),
    primaryIframe: stream.primaryIframe || (servers[0] && (servers[0].url || servers[0].link)) || null,
    servers: servers.map((s, i) => ({
      name: s.server || s.name || s.label || `Server ${i + 1}`,
      url: s.url || s.link || s.embed || ""
    })).filter((s) => s.url)
  };
}

/* Pemeran bisa datang sebagai string biasa atau objek { name, character, photo }.
   Sumber data (hasil scraping pihak ketiga) kadang memakai nama field foto yang
   berbeda-beda, atau memberi path relatif ala TMDB (mis. "/eASy0n....jpg")
   lewat field profile_path — bukan URL penuh. Fungsi ini mencoba banyak
   kemungkinan supaya foto pemeran tetap bisa tampil. */
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w185";

function normalizeCastMember(c) {
  if (!c) return null;
  if (typeof c === "string") return { name: c, character: "", photo: null };
  const name = c.name || c.nama || "";
  if (!name) return null;

  let photo =
    c.photo || c.image || c.foto || c.avatar || c.picture ||
    c.photoUrl || c.photo_url || c.profile || c.profileImage || null;

  if (!photo) {
    const relPath = c.profile_path || c.profilePath;
    if (relPath) photo = relPath;
  }

  // Kalau nilainya path relatif (bukan URL http/https/data penuh), lengkapi
  // jadi URL gambar TMDB supaya benar-benar bisa dimuat oleh <img>.
  if (photo && !/^(https?:)?\/\//i.test(photo) && !photo.startsWith("data:")) {
    photo = `${TMDB_IMG_BASE}${photo.startsWith("/") ? "" : "/"}${photo}`;
  }

  return {
    name,
    character: c.character || c.role || c.peran || "",
    photo: photo || null
  };
}

/* Navigasi ke halaman detail penuh (bukan popup). `seed` = data ringan dari
   kartu (untuk tampilan instan sebelum data lengkap datang dari API). */
function openFilmPage(seed, { push = true } = {}) {
  if (!seed || !seed.slug) return;
  currentFilmSlug = seed.slug;

  pushHistory(seed);
  showToast(`Ditambahkan ke Riwayat · ${truncate(seed.title, 34)}`);

  // Sembunyikan semua view nav utama, aktifkan halaman detail
  views.forEach((v) => $(`#view-${v}`).classList.remove("active"));
  $("#view-watch").classList.remove("active");
  $("#view-detail").classList.add("active");
  $$(".sb-link, .bn-link").forEach((el) => el.classList.remove("active"));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  const targetPath = `/film/${encodeURIComponent(seed.slug)}`;
  if (push && location.pathname !== targetPath) {
    history.pushState({ film: seed.slug }, "", targetPath);
  } else if (!push) {
    history.replaceState({ film: seed.slug }, "", targetPath);
  }

  renderDetailSkeleton(seed);
  loadFilmDetail(seed.slug, seed);
}

function renderDetailSkeleton(seed) {
  detailContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="detailBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(seed && seed.title ? seed.title : "Memuat...")}</span>
    </div>
    <div class="detail-skel">
      <div class="skeleton sk-hero"></div>
      <div class="skeleton sk-line" style="width:60%;height:30px;margin-top:20px"></div>
      <div class="skeleton sk-line" style="width:40%"></div>
      <div class="skeleton sk-line" style="width:90%;margin-top:20px"></div>
      <div class="skeleton sk-line" style="width:80%"></div>
      <div class="skeleton sk-line" style="width:85%"></div>
    </div>
  `;
  wireDetailBack();
}

function wireDetailBack() {
  const btn = $("#detailBackBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (history.state && history.state.film) {
      history.back();
    } else {
      goToView("home");
    }
  });
}

async function loadFilmDetail(slug, seed) {
  const res = await apiCall("detail", { slug });
  const raw = res && (res.results !== undefined ? res.results : res);

  if (currentFilmSlug !== slug) return; // pengguna sudah pindah halaman

  if (!res || res.status === false || !raw || typeof raw !== "object") {
    renderDetailError(seed);
    return;
  }

  const film = normalizeDetail(raw);
  if (Array.isArray(raw.cast) && raw.cast.length && !film.cast.some((c) => c.photo)) {
    // Tidak ada satupun pemeran yang punya foto setelah dinormalisasi —
    // kemungkinan sumber data memang tidak menyertakan foto untuk judul ini,
    // atau memakai nama field yang belum dikenali. Log data mentahnya di
    // console browser (F12) untuk membantu pengecekan nama field yang benar.
    console.debug("[ZaamMovie] Raw cast tanpa foto terdeteksi:", raw.cast);
  }
  renderDetailPage(film);
}

function renderDetailError(seed) {
  detailContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="detailBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(seed && seed.title ? seed.title : "")}</span>
    </div>
    <div class="state-block">
      <svg class="icon"><use href="#ic-film"/></svg>
      <div class="state-title">Gagal memuat detail</div>
      <div class="state-sub">Sumber data film ini sedang tidak bisa diakses. Coba lagi beberapa saat lagi.</div>
      <button class="state-retry" id="detailRetryBtn">Coba lagi</button>
    </div>
  `;
  wireDetailBack();
  $("#detailRetryBtn").addEventListener("click", () => {
    if (!seed) return;
    renderDetailSkeleton(seed);
    loadFilmDetail(seed.slug, seed);
  });
}

function renderDetailPage(film) {
  const genreChips = (film.genres || [])
    .map((g) => `<span class="genre-chip">${escapeHTML(g)}</span>`)
    .join("");

  const castChips = (film.cast || [])
    .slice(0, 14)
    .map(
      (c) => `
      <div class="cast-card">
        <div class="cast-avatar">
          <img src="${c.photo || PLACEHOLDER_AVATAR}" alt="${escapeHTML(c.name)}" loading="lazy"
               draggable="false" oncontextmenu="return false"
               onerror="this.src='${PLACEHOLDER_AVATAR}'"/>
        </div>
        <div class="cast-name">${escapeHTML(c.name)}</div>
        ${c.character ? `<div class="cast-character">${escapeHTML(c.character)}</div>` : ""}
      </div>`
    )
    .join("");

  const metaRows = [
    film.director ? ["Sutradara", film.director] : null,
    film.releaseDate ? ["Rilis", film.releaseDate] : null,
    film.status ? ["Status", film.status] : null,
    film.numberOfSeasons ? ["Musim", film.numberOfSeasons] : null,
    film.numberOfEpisodes ? ["Episode", film.numberOfEpisodes] : null,
  ].filter(Boolean);

  const metaHTML = metaRows
    .map(
      ([label, value]) => `
      <div class="mg-row"><span class="mg-label">${escapeHTML(label)}</span><span class="mg-value">${escapeHTML(String(value))}</span></div>`
    )
    .join("");

  detailContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="detailBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(film.title)}</span>
    </div>

    <div class="detail-hero" style="background-image:url('${film.backdrop}')"></div>

    <div class="detail-header">
      <div class="detail-poster">
        <img src="${film.poster}" alt="Poster ${escapeHTML(film.title)}"
             draggable="false" oncontextmenu="return false"
             onerror="this.src='${PLACEHOLDER_POSTER}'" />
      </div>
      <div class="detail-heading">
        <span class="detail-type-badge">${escapeHTML(film.type)}</span>
        <h1 class="detail-title">${escapeHTML(film.title)}</h1>
        ${film.tagline ? `<div class="detail-tagline">${escapeHTML(film.tagline)}</div>` : ""}
      </div>
    </div>

    <div class="detail-badges">
      ${film.rating ? `<span class="badge-rating">${starIcon()} ${escapeHTML(String(film.rating))}</span>` : ""}
      ${film.year ? `<span><svg class="icon icon-sm"><use href="#ic-calendar"/></svg> ${escapeHTML(String(film.year))}</span>` : ""}
      ${film.duration ? `<span><svg class="icon icon-sm"><use href="#ic-clock"/></svg> ${escapeHTML(String(film.duration))}</span>` : ""}
    </div>

    ${genreChips ? `<div class="detail-genres">${genreChips}</div>` : ""}

    <div class="detail-actions">
      <button class="btn btn-primary" id="goWatchBtn"><svg class="icon icon-sm"><use href="#ic-play"/></svg> Tonton Sekarang</button>
      ${film.trailer ? `<button class="btn btn-ghost" id="trailerBtn"><svg class="icon icon-sm"><use href="#ic-clapper"/></svg> Tonton Trailer</button>` : ""}
    </div>

    <div class="detail-section">
      <h3><svg class="icon icon-sm"><use href="#ic-info"/></svg> Sinopsis</h3>
      <p class="detail-synopsis">${escapeHTML(film.synopsis)}</p>
    </div>

    ${metaHTML ? `<div class="detail-section"><h3><svg class="icon icon-sm"><use href="#ic-film"/></svg> Info</h3><div class="detail-meta-grid">${metaHTML}</div></div>` : ""}

    ${castChips ? `<div class="detail-section"><h3><svg class="icon icon-sm"><use href="#ic-star"/></svg> Pemeran</h3><div class="cast-scroll">${castChips}</div></div>` : ""}
  `;

  wireDetailBack();

  const goWatchBtn = $("#goWatchBtn");
  if (goWatchBtn) {
    goWatchBtn.addEventListener("click", () => {
      if (!film.primaryIframe && !(film.servers && film.servers.length)) {
        showToast("Server streaming belum tersedia untuk judul ini.");
        return;
      }
      openWatchPage(film);
    });
  }

  const trailerBtn = $("#trailerBtn");
  if (trailerBtn) {
    trailerBtn.addEventListener("click", () => openTrailerModal(film.trailer, film.title));
  }
}

/* ---------------- Trailer modal (YouTube) ---------------- */

function getYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/
  );
  return m ? m[1] : null;
}

function openTrailerModal(url, title) {
  const ytId = getYouTubeId(url);
  const modal = $("#trailerModal");
  const frameSlot = $("#trailerModalFrame");
  if (!modal || !frameSlot) return;

  if (ytId) {
    frameSlot.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0" title="Trailer ${escapeHTML(title || "")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
  } else {
    // Bukan link YouTube yang dikenali — buka di tab baru sebagai fallback.
    window.open(url, "_blank", "noopener");
    return;
  }
  modal.classList.add("show");
}

function closeTrailerModal() {
  const modal = $("#trailerModal");
  const frameSlot = $("#trailerModalFrame");
  if (!modal) return;
  modal.classList.remove("show");
  if (frameSlot) frameSlot.innerHTML = ""; // hentikan pemutaran video
}

$("#trailerModalClose").addEventListener("click", closeTrailerModal);
$("#trailerModalBackdrop").addEventListener("click", closeTrailerModal);

/* ---------------- Player iframe: sandbox ketat + fallback ---------------- */

// Izin sandbox iframe seminimal mungkin — hanya yang dibutuhkan agar player
// (skrip pemutar, kualitas, kontrol) tetap berfungsi:
//  - allow-scripts       : wajib, hampir semua player video butuh JS
//  - allow-same-origin   : wajib supaya skrip player bisa akses resource di origin-nya sendiri
//  - allow-presentation  : dukungan tampilan/casting player, tidak berisiko
//  - allow-orientation-lock : agar player bisa lock ke landscape saat fullscreen di HP
// SENGAJA TIDAK diberikan (ini yang memblok iklan redirect/popup/keluar tab):
//  - allow-popups / allow-popups-to-escape-sandbox → memblokir window.open (popup iklan)
//  - allow-top-navigation (+ -by-user-activation)  → memblokir ganti alamat tab utama
//  - allow-forms                                   → tidak dibutuhkan player, dihilangkan
//  - allow-modals                                  → memblokir alert/confirm dari iklan
const PLAYER_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-orientation-lock";
// Beberapa provider (2Embed, SuperEmbed, dst) menolak memutar video kalau
// iframe-nya masih punya atribut sandbox sama sekali — tidak cukup
// dilonggarkan dengan token seperti allow-popups, harus benar-benar dihapus.
// Daripada melepas sandbox untuk SEMUA server (bikin proteksi anti-iklan
// percuma), kita hanya lepas otomatis untuk server yang memang dikenal butuh
// itu. Dicocokkan lewat NAMA server (stabil, tampil di tab UI) — bukan lewat
// domain, karena domain CDN provider seperti ini sering ganti-ganti/acak,
// sedangkan nama servernya tetap sama.
//
// Tambahkan nama provider lain ke sini kalau nanti ketemu gejala sama
// ("Sandbox not allowed" / "Sandboxing is not allowed" / player kosong tapi
// tidak pernah trigger event error/load gagal).
// vidsrc & vidlink ditambahkan karena keduanya menampilkan pesan
// "This content can't be embedded in a sandboxed frame" saat atribut
// sandbox masih terpasang — sama seperti 2embed/superembed.
const SANDBOX_SENSITIVE_SERVER_NAMES = ["2embed", "superembed", "vidsrc", "vidlink"];

function needsCompatSandbox(serverName) {
  if (!serverName) return false;
  const name = serverName.toLowerCase();
  return SANDBOX_SENSITIVE_SERVER_NAMES.some((n) => name.includes(n));
}

const PLAYER_LOAD_TIMEOUT_MS = 15000; // 15 detik — kalau belum "load", anggap gagal
let playerCompatMode = false; // override manual dari tombol, reset tiap render player baru

let playerLoadTimer = null;
let playerLoadToken = 0;

function renderPlayerHTML(film) {
  const initialUrl = film.primaryIframe || (film.servers[0] && film.servers[0].url);
  if (!initialUrl) {
    return `<p class="modal-raw" style="color:var(--muted);font-family:var(--font-mono);font-size:12px">Server streaming belum tersedia untuk judul ini.</p>`;
  }
  playerCompatMode = false;
  const tabs = film.servers.length
    ? `<div class="server-tabs">${film.servers
        .map(
          (s, i) => `<button class="server-tab${initialUrl === s.url ? " active" : ""}" data-i="${i}">
              <span class="dot-live"></span>${escapeHTML(s.name)}
            </button>`
        )
        .join("")}</div>`
    : "";
  return `
    ${tabs}
    <div class="player-wrap">
      <div class="player-loading" id="playerLoading">Memuat server...</div>
      <div class="player-fallback" id="playerFallback" style="display:none">
        <svg class="icon"><use href="#ic-film"/></svg>
        <div class="state-title">Server gagal dimuat</div>
        <div class="state-sub">Coba pilih server lain di atas, atau muat ulang server ini.</div>
        <button class="state-retry" id="playerRetryBtn">Muat ulang</button>
      </div>
      <iframe
        id="filmPlayer"
        src=""
        loading="lazy"
        allowfullscreen
        allow="fullscreen; picture-in-picture; encrypted-media"
        sandbox="${PLAYER_SANDBOX}"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
    <button class="player-compat-btn" id="playerCompatBtn" type="button">
      Server tidak mau muter? Coba mode kompatibel
    </button>
  `;
}

// Set/ganti URL iframe player dengan proteksi timeout: kalau event "load"
// tidak muncul dalam PLAYER_LOAD_TIMEOUT_MS, tampilkan fallback (bukan layar
// kosong selamanya). Dipakai baik untuk pemuatan awal maupun ganti server.
// `server` = { name, url }.
function setPlayerSrc(container, server) {
  const iframe = $("#filmPlayer", container);
  const loading = $("#playerLoading", container);
  const fallback = $("#playerFallback", container);
  const url = server && server.url;
  if (!iframe || !url) return;

  if (fallback) fallback.style.display = "none";
  if (loading) loading.style.display = "flex";

  if (playerLoadTimer) clearTimeout(playerLoadTimer);
  const myToken = ++playerLoadToken;

  const isAuto = needsCompatSandbox(server.name);
  const useCompat = playerCompatMode || isAuto;
  if (useCompat) {
    // 2Embed/SuperEmbed (dan sejenisnya) menolak main kalau atribut sandbox
    // masih ada sama sekali — token seperti allow-popups saja tidak cukup,
    // jadi untuk server ini atributnya benar-benar dihapus (bukan cuma
    // dilonggarkan). Trade-off ini sadar dan disengaja: berlaku HANYA untuk
    // server yang butuh, server lain tetap terkunci ketat.
    iframe.removeAttribute("sandbox");
    iframe.removeAttribute("referrerpolicy");
  } else {
    iframe.setAttribute("sandbox", PLAYER_SANDBOX);
    iframe.setAttribute("referrerpolicy", "no-referrer");
  }
  iframe.src = url;

  playerLoadTimer = setTimeout(() => {
    if (myToken !== playerLoadToken) return; // pengguna sudah pindah server/halaman lain
    if (loading) loading.style.display = "none";
    if (fallback) fallback.style.display = "flex";
  }, PLAYER_LOAD_TIMEOUT_MS);

  updateCompatBtnLabel(container, useCompat, isAuto);
}

function updateCompatBtnLabel(container, isCompatActive, isAuto) {
  const btn = $("#playerCompatBtn", container);
  if (!btn) return;
  btn.classList.toggle("active", isCompatActive);
  if (isCompatActive && isAuto) {
    btn.disabled = true;
    btn.textContent = "Mode kompatibel aktif otomatis untuk server ini (popup/redirect iklan mungkin muncul)";
  } else if (isCompatActive) {
    btn.disabled = false;
    btn.textContent = "Mode kompatibel aktif (popup/redirect iklan mungkin muncul) — matikan";
  } else {
    btn.disabled = false;
    btn.textContent = "Server tidak mau muter? Coba mode kompatibel";
  }
}

// Pasang listener load/error + tombol retry + inisialisasi pemuatan awal.
function initPlayer(container, film) {
  const iframe = $("#filmPlayer", container);
  const loading = $("#playerLoading", container);
  const fallback = $("#playerFallback", container);
  if (!iframe) return;

  const markLoaded = () => {
    clearTimeout(playerLoadTimer);
    if (loading) loading.style.display = "none";
    if (fallback) fallback.style.display = "none";
  };
  const markFailed = () => {
    clearTimeout(playerLoadTimer);
    if (loading) loading.style.display = "none";
    if (fallback) fallback.style.display = "flex";
  };

  iframe.addEventListener("load", markLoaded);
  iframe.addEventListener("error", markFailed);

  const retryBtn = $("#playerRetryBtn", container);
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      const activeTab = $(".server-tab.active", container);
      const idx = activeTab ? Number(activeTab.dataset.i) : 0;
      const s = film.servers[idx] || { name: null, url: film.primaryIframe };
      setPlayerSrc(container, s);
    });
  }

  const compatBtn = $("#playerCompatBtn", container);
  if (compatBtn) {
    compatBtn.addEventListener("click", () => {
      playerCompatMode = !playerCompatMode;
      const activeTab = $(".server-tab.active", container);
      const idx = activeTab ? Number(activeTab.dataset.i) : 0;
      const s = film.servers[idx] || { name: null, url: film.primaryIframe };
      setPlayerSrc(container, s);
    });
  }

  const initialServer = film.servers[0] || { name: null, url: film.primaryIframe };
  setPlayerSrc(container, initialServer);
}

function wireServerTabs(film, container = detailContent) {
  $$(".server-tab", container).forEach((tab) => {
    tab.addEventListener("click", () => {
      const s = film.servers[Number(tab.dataset.i)];
      if (!s) return;
      $$(".server-tab", container).forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      setPlayerSrc(container, s);
    });
  });
}

/* ---------------- Watch page (halaman streaming sendiri) ---------------- */

/* Navigasi ke halaman streaming penuh, terpisah dari halaman detail.
   `film` = objek film hasil normalizeDetail (sudah lengkap dengan servers). */
function openWatchPage(film, { push = true } = {}) {
  if (!film || !film.slug) return;
  currentWatchSlug = film.slug;
  currentFilmSlug = null;

  views.forEach((v) => $(`#view-${v}`).classList.remove("active"));
  $("#view-detail").classList.remove("active");
  $("#view-watch").classList.add("active");
  $$(".sb-link, .bn-link").forEach((el) => el.classList.remove("active"));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  const targetPath = `/nonton/${encodeURIComponent(film.slug)}`;
  if (push && location.pathname !== targetPath) {
    history.pushState({ watch: film.slug }, "", targetPath);
  } else if (!push) {
    history.replaceState({ watch: film.slug }, "", targetPath);
  }

  renderWatchPage(film);
}

function renderWatchSkeleton(seed) {
  watchContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="watchBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(seed && seed.title ? seed.title : "Memuat...")}</span>
    </div>
    <div class="detail-skel">
      <div class="skeleton" style="aspect-ratio:16/9;border-radius:10px"></div>
      <div class="skeleton sk-line" style="width:40%;margin-top:16px"></div>
    </div>
  `;
  wireWatchBack();
}

function wireWatchBack() {
  const btn = $("#watchBackBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (history.state && history.state.watch) {
      history.back();
    } else {
      goToView("home");
    }
  });
}

async function loadWatchDetail(slug, seed) {
  const res = await apiCall("detail", { slug });
  const raw = res && (res.results !== undefined ? res.results : res);

  if (currentWatchSlug !== slug) return; // pengguna sudah pindah halaman

  if (!res || res.status === false || !raw || typeof raw !== "object") {
    renderWatchError(seed);
    return;
  }

  const film = normalizeDetail(raw);
  renderWatchPage(film);
}

function renderWatchError(seed) {
  watchContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="watchBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(seed && seed.title ? seed.title : "")}</span>
    </div>
    <div class="state-block">
      <svg class="icon"><use href="#ic-film"/></svg>
      <div class="state-title">Gagal memuat server streaming</div>
      <div class="state-sub">Sumber data film ini sedang tidak bisa diakses. Coba lagi beberapa saat lagi.</div>
      <button class="state-retry" id="watchRetryBtn">Coba lagi</button>
    </div>
  `;
  wireWatchBack();
  $("#watchRetryBtn").addEventListener("click", () => {
    if (!seed) return;
    renderWatchSkeleton(seed);
    loadWatchDetail(seed.slug, seed);
  });
}

function renderWatchPage(film) {
  watchContent.innerHTML = `
    <div class="detail-topbar">
      <button class="detail-back" id="watchBackBtn"><svg class="icon icon-sm"><use href="#ic-chevron-left"/></svg></button>
      <span class="detail-topbar-title">${escapeHTML(film.title)}</span>
    </div>
    <div class="detail-section" id="watchPlayerSection" style="margin-top:16px">
      ${renderPlayerHTML(film)}
    </div>
  `;
  wireWatchBack();
  wireServerTabs(film, watchContent);
  if (film.primaryIframe || (film.servers && film.servers.length)) {
    initPlayer(watchContent, film);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const trailerModal = $("#trailerModal");
  if (trailerModal && trailerModal.classList.contains("show")) {
    closeTrailerModal();
    return;
  }
  if ($("#view-detail").classList.contains("active") || $("#view-watch").classList.contains("active")) {
    history.back();
  }
});

/* ---------------- Init ---------------- */

wireSearch($("#searchInput"), $("#searchResults"));
wireSearch($("#topSearchInput"), $("#searchResults"));
$("#topSearchInput").addEventListener("focus", () => {
  if (activeViewName() !== "search") goToView("search");
});

$("#searchResults").innerHTML = `
  <div class="state-block" style="grid-column:1/-1">
    <svg class="icon"><use href="#ic-search"/></svg>
    <div class="state-title">Cari film favoritmu</div>
    <div class="state-sub">Ketik judul film atau series untuk mulai mencari di ZaamMovie.</div>
  </div>`;

// Muat tampilan sesuai URL saat halaman pertama dibuka (mis. dibuka langsung
// lewat domain.netlify.app/search atau domain.netlify.app/film/movie-49013)
routeCurrentLocation({ push: false });
loadHome();
