const TMDB_KEY = '15d2aea6733f7d6325bf14266b6c3ff6';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const movieContainer = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const sectionHeading = document.getElementById('section-heading');

const modal = document.getElementById('player-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-movie-title');
const playerIframe = document.getElementById('player-iframe');
const serverList = document.getElementById('server-list');

// Helper Fetch Data TMDB
async function fetchTMDB(endpoint, params = {}) {
  try {
    const query = new URLSearchParams({ api_key: TMDB_KEY, language: 'id-ID', ...params }).toString();
    const res = await fetch(`${TMDB_BASE}${endpoint}?${query}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('Gagal mengambil data:', err);
    return [];
  }
}

// Render Kartu Film
function renderMovies(movies) {
  movieContainer.innerHTML = '';
  if (!movies || movies.length === 0) {
    movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Film tidak ditemukan.</p>';
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
    const title = movie.title || movie.name || 'Tanpa Judul';

    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${poster}" alt="${title}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-title" title="${title}">${title}</div>
      </div>
    `;
    card.addEventListener('click', () => openMovieDetail(movie.id, title));
    movieContainer.appendChild(card);
  });
}

// Load Home (Film Terbaru / Sedang Tayang)
async function loadHome() {
  sectionHeading.textContent = 'Film Terbaru';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchTMDB('/movie/now_playing');
  renderMovies(movies);
}

// Load Rating Terbaik
async function loadRating() {
  sectionHeading.textContent = 'Rating Terbaik';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchTMDB('/movie/top_rated');
  renderMovies(movies);
}

// Fitur Search (Pencarian Otomatis)
let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const query = e.target.value.trim();
  
  if (!query) {
    loadHome();
    return;
  }

  searchTimer = setTimeout(async () => {
    sectionHeading.textContent = `Hasil Pencarian: "${query}"`;
    movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Mencari film...</p>';
    const movies = await fetchTMDB('/search/movie', { query });
    renderMovies(movies);
  }, 400);
});

// Fitur Navigasi Filter
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    searchInput.value = '';

    const filter = btn.getAttribute('data-filter');
    if (filter === 'home') loadHome();
    if (filter === 'rating') loadRating();
  });
});

// Detail Film & Player Streaming Modal
function openMovieDetail(tmdbId, title) {
  modalTitle.textContent = title || 'Nonton Film';
  playerIframe.src = '';
  serverList.innerHTML = '';
  modal.classList.add('active');

  const servers = [
    { name: 'Server Utama', embed: `https://vidsrc.cc/v2/embed/movie/${tmdbId}` },
    { name: 'Server Cadangan 1', embed: `https://vidlink.pro/movie/${tmdbId}` },
    { name: 'Server Cadangan 2', embed: `https://embed.su/embed/movie/${tmdbId}` },
    { name: 'Server Cadangan 3', embed: `https://2embed.cc/embed/${tmdbId}` }
  ];

  servers.forEach((srv, index) => {
    const btn = document.createElement('button');
    btn.className = `server-btn ${index === 0 ? 'active' : ''}`;
    btn.textContent = srv.name;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playerIframe.src = srv.embed;
    });
    serverList.appendChild(btn);
  });

  playerIframe.src = servers[0].embed;
}

// Tutup Modal
closeModalBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  playerIframe.src = '';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
    playerIframe.src = '';
  }
});

// Inisialisasi awal
loadHome();
