// Masukkan API Key OMDb kamu di sini
const OMDB_KEY = '32ec55d1'; // Ganti dengan key dari email kamu jika beda
const OMDB_BASE = 'https://www.omdbapi.com/';

const movieContainer = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const sectionHeading = document.getElementById('section-heading');

const modal = document.getElementById('player-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-movie-title');
const playerIframe = document.getElementById('player-iframe');
const serverList = document.getElementById('server-list');

// Helper Fetch OMDb API
async function fetchOMDb(params = {}) {
  try {
    const queryStr = new URLSearchParams({ apikey: OMDB_KEY, type: 'movie', ...params }).toString();
    const res = await fetch(`${OMDB_BASE}?${queryStr}`);
    const data = await res.json();
    
    if (data.Response === 'True') {
      return data.Search || data;
    } else {
      console.error('OMDb Error:', data.Error);
      return null;
    }
  } catch (err) {
    console.error('Gagal mengambil data OMDb:', err);
    return null;
  }
}

// Render Kartu Film
function renderMovies(movies) {
  movieContainer.innerHTML = '';
  if (!movies || !Array.isArray(movies) || movies.length === 0) {
    movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Film tidak ditemukan. Pastikan API Key OMDb sudah diaktivasi via email.</p>';
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';

    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${poster}" alt="${movie.Title}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-title" title="${movie.Title}">${movie.Title} (${movie.Year})</div>
      </div>
    `;
    card.addEventListener('click', () => openMovieDetail(movie.imdbID, movie.Title));
    movieContainer.appendChild(card);
  });
}

// Load Home (Tampilkan rekomendasi)
async function loadHome() {
  sectionHeading.textContent = 'Film Populer';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchOMDb({ s: 'Avengers' });
  renderMovies(movies);
}

// Load Rating
async function loadRating() {
  sectionHeading.textContent = 'Rating Terbaik';
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Memuat film...</p>';
  const movies = await fetchOMDb({ s: 'Batman' });
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
    const movies = await fetchOMDb({ s: query });
    renderMovies(movies);
  }, 500);
});

// Fitur Filter
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

// Modal Pemutar Video (Menggunakan IMDb ID)
function openMovieDetail(imdbID, title) {
  modalTitle.textContent = title || 'Nonton Film';
  playerIframe.src = '';
  serverList.innerHTML = '';
  modal.classList.add('active');

  const servers = [
    { name: 'Server 1 (VidSrc)', embed: `https://vidsrc.to/embed/movie/${imdbID}` },
    { name: 'Server 2 (2Embed)', embed: `https://www.2embed.cc/embed/${imdbID}` },
    { name: 'Server 3 (Autoembed)', embed: `https://player.autoembed.cc/embed/movie/${imdbID}` }
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

// Jalankan saat halaman dibuka
loadHome();
