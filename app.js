const API_BASE = '/api/will-movies'; // API Anda tetap dipertahankan

// Elemen DOM dari UI Baru
const movieContainer = document.getElementById('movie-container');
const heroBanner = document.getElementById('hero-banner');
const heroTitle = document.getElementById('hero-title');
const heroMeta = document.getElementById('hero-meta');
const navItems = document.querySelectorAll('.nav-item');
const searchIcons = document.querySelectorAll('.fa-magnifying-glass'); // Ikon pencarian di header dan navbar

// ==========================================
// 1. INJEKSI MODAL STREAMING SECARA DINAMIS
// ==========================================
function createModalHTML() {
  if (document.getElementById('player-modal')) return;
  const modalHTML = `
    <div id="player-modal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modal-movie-title">Memuat Pemutar...</h3>
          <button id="close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="iframe-container">
          <iframe id="player-iframe" allowfullscreen></iframe>
        </div>
        <div id="server-list" class="server-list"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const style = document.createElement('style');
  style.innerHTML = `
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; display: none; align-items: center; justify-content: center; padding: 20px; }
    .modal-overlay.active { display: flex; }
    .modal-content { background: var(--bg-surface); width: 100%; max-width: 800px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
    .modal-header { display: flex; justify-content: space-between; padding: 15px 20px; background: var(--bg-main); border-bottom: 1px solid var(--bg-surface-hover); }
    #close-modal { background: none; border: none; color: var(--text-main); font-size: 1.2rem; cursor: pointer; }
    .iframe-container { position: relative; padding-bottom: 56.25%; height: 0; }
    .iframe-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .server-list { display: flex; gap: 10px; padding: 15px; overflow-x: auto; background: var(--bg-main); scrollbar-width: none; }
    .server-btn { padding: 8px 16px; background: var(--bg-surface-hover); color: var(--text-main); border: none; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer; white-space: nowrap; transition: 0.3s; }
    .server-btn.active { background: var(--primary); font-weight: bold; color: #fff;}
  `;
  document.head.appendChild(style);
}
createModalHTML();

// Deklarasi ulang elemen modal setelah diinjeksi
const modal = document.getElementById('player-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-movie-title');
const playerIframe = document.getElementById('player-iframe');
const serverList = document.getElementById('server-list');

// ==========================================
// 2. HELPER FETCH API
// ==========================================
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

// ==========================================
// 3. RENDER UI UTAMA (HERO BANNER & GRID)
// ==========================================
function renderMovies(movies, titleText = "Populer Minggu Ini") {
  // Ubah teks judul section
  const sectionTitle = document.querySelector('.section-title span');
  if(sectionTitle) sectionTitle.textContent = titleText;

  movieContainer.innerHTML = '';

  if (!movies || movies.length === 0) {
    movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;">Film tidak ditemukan.</p>';
    return;
  }

  // --- Setup Hero Banner (Ambil dari film urutan pertama) ---
  const heroMovie = movies[0];
  heroBanner.style.backgroundImage = `url('${heroMovie.thumbnail || 'https://via.placeholder.com/800x600?text=No+Image'}')`;
  heroTitle.textContent = heroMovie.title;
  heroMeta.innerHTML = `<span><i class="fa-solid fa-star"></i> N/A</span><span>HD</span>`;
  
  // Sambungkan tombol "Tonton" di Hero Banner ke Modal
  const btnTontonHero = document.querySelector('.btn-tonton');
  if(btnTontonHero) {
    // Kloning tombol untuk mereset EventListener lama jika ada
    const newBtn = btnTontonHero.cloneNode(true);
    btnTontonHero.parentNode.replaceChild(newBtn, btnTontonHero);
    newBtn.addEventListener('click', () => openMovieDetail(heroMovie.slug));
  }

  // --- Setup Grid Movies (Tampilkan semua) ---
  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${movie.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image'}" class="poster" alt="${movie.title}" loading="lazy">
      <div class="rating-badge"><i class="fa-solid fa-star"></i> -.-</div>
      <div class="card-title" title="${movie.title}">${movie.title}</div>
      <div class="card-year">HD</div>
    `;
    // Buka detail (Modal Streaming) jika kartu diklik
    card.addEventListener('click', () => openMovieDetail(movie.slug));
    movieContainer.appendChild(card);
  });
}

// ==========================================
// 4. LOGIKA LOAD & PENCARIAN
// ==========================================
async function loadHome() {
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat film...</p>';
  const movies = await fetchAPI({ action: 'home' });
  renderMovies(movies, "Terbaru Ditambahkan");
}

async function loadRating() {
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat film...</p>';
  const movies = await fetchAPI({ action: 'rating' });
  renderMovies(movies, "Rating Terbaik");
}

async function searchMovie(query) {
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari film...</p>';
  const movies = await fetchAPI({ action: 'search', query });
  renderMovies(movies, `Hasil: "${query}"`);
}

// Fitur Pencarian via Prompt (Karena di UI baru belum ada input form)
searchIcons.forEach(icon => {
  icon.parentElement.addEventListener('click', (e) => {
    e.preventDefault();
    const query = prompt("Cari judul film:");
    if (query && query.trim() !== '') {
      searchMovie(query.trim());
    }
  });
});

// Fitur Navigasi Bawah
navItems.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const text = btn.querySelector('span').textContent.toLowerCase();
    
    // Jangan hapus status aktif jika klik cari, agar tab yang lama tetap menyala
    if(text !== 'cari') {
      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    if (text === 'beranda') loadHome();
    if (text === 'trending') loadRating();
  });
});

// ==========================================
// 5. MODAL STREAMING (SAMA SEPERTI KODE ASLI)
// ==========================================
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

// ==========================================
// INISIALISASI AWAL
// ==========================================
loadHome();
