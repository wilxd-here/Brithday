const API_BASE = '/.netlify/functions/will-movies';

const movieContainer = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const sectionHeading = document.getElementById('section-heading');

const modal = document.getElementById('player-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-movie-title');
const playerIframe = document.getElementById('player-iframe');
const serverList = document.getElementById('server-list');

// Helper Ambil Data
async function fetchAPI(params) {
  try {
    const queryStr = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}?${queryStr}`);
    const json = await res.json();
    return json.status === 'success' ? json.data : [];
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
    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${movie.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-title" title="${movie.title}">${movie.title}</div>
      </div>
    `;
    card.addEventListener('click', () => openMovieDetail(movie.slug));
    movieContainer.appendChild(card);
  });
}

// Load Home
async function loadHome() {
  sectionHeading.textContent = 'Film Terbaru';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchAPI({ action: 'home' });
  renderMovies(movies);
}

// Load Rating
async function loadRating() {
  sectionHeading.textContent = 'Rating Terbaik';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchAPI({ action: 'rating' });
  renderMovies(movies);
}

// Fitur Search
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
    const movies = await fetchAPI({ action: 'search', query });
    renderMovies(movies);
  }, 500);
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
async function openMovieDetail(slug) {
  modalTitle.textContent = 'Memuat Pemutar...';
  playerIframe.src = '';
  serverList.innerHTML = '';
  modal.classList.add('active');

  const detail = await fetchAPI({ slug });

  if (detail && detail.serverPlayer && detail.serverPlayer.length > 0) {
    modalTitle.textContent = detail.title || 'Nonton Film';
    
    detail.serverPlayer.forEach((srv, index) => {
      const btn = document.createElement('button');
      btn.className = `server-btn ${index === 0 ? 'active' : ''}`;
      btn.textContent = srv.server;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playerIframe.src = srv.embed;
      });
      serverList.appendChild(btn);
    });

    playerIframe.src = detail.serverPlayer[0].embed;
  } else {
    modalTitle.textContent = 'Video Tidak Tersedia';
  }
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
