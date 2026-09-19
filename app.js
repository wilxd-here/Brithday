const API_BASE = '/api/will-movies'; 

// Elemen DOM Dasar
const movieContainer = document.getElementById('movie-container');
const heroBanner = document.getElementById('hero-banner');
const navItems = document.querySelectorAll('.nav-item');
const searchIcons = document.querySelectorAll('.fa-magnifying-glass');

// ==========================================
// 1. INJEKSI HALAMAN DETAIL & MODAL SEARCH
// ==========================================
function createDynamicViews() {
  const style = document.createElement('style');
  style.innerHTML = `
    .d-none { display: none !important; }
    
    /* Halaman Detail Nonton */
    #detail-view { width: 100%; min-height: 100vh; padding-bottom: 80px; background: var(--bg-main); color: var(--text-main); }
    .detail-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--bg-surface); }
    .detail-header button { background: none; border: none; color: var(--text-main); font-size: 1.2rem; cursor: pointer; }
    .detail-header h3 { font-size: 1rem; font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
    
    /* Video Player & Loading Animasi */
    .player-wrapper { position: relative; padding-bottom: 56.25%; height: 0; background: #0b0f19; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    
    .loading-media { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; z-index: 2; transition: opacity 0.3s; }
    .loading-media i { font-size: 2rem; color: var(--primary); margin-bottom: 10px; animation: spin 1s linear infinite; }
    .loading-media p { font-size: 1.2rem; font-weight: bold; margin: 0; }
    .loading-media span { font-size: 0.85rem; color: var(--text-muted); margin-top: 5px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    /* Utility Actions */
    .player-actions { display: flex; gap: 10px; padding: 15px 20px; border-bottom: 1px solid var(--bg-surface); }
    .player-actions button { flex: 1; background: var(--bg-surface); color: var(--text-main); border: none; padding: 10px; border-radius: var(--radius-md); font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-weight: 500; }
    
    /* Server Section */
    .server-section { padding: 20px; border-bottom: 1px solid var(--bg-surface); }
    .server-section h4 { font-size: 1rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
    .server-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .server-btn-grid { background: var(--bg-surface); color: var(--text-muted); border: 1px solid transparent; padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: 0.2s; }
    .server-btn-grid .dot { display: inline-block; width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; margin-right: 8px; }
    .server-btn-grid.active { background: #1a1500; border-color: var(--primary); color: var(--primary); font-weight: bold; }
    .server-btn-grid.active .dot { background: var(--primary); }
    .server-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 15px; display: flex; align-items: center; gap: 6px; }
    
    /* Info Section */
    .movie-info-section { padding: 20px; }
    .movie-info-section h2 { font-size: 1.3rem; margin-bottom: 10px; }
    .movie-meta-info { display: flex; gap: 15px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; align-items: center; }
    .meta-type { color: var(--primary); font-weight: bold; }
    .meta-rating { display: flex; align-items: center; gap: 4px; color: var(--primary); }
    .synopsis-text { font-size: 0.9rem; line-height: 1.5; color: #ccc; }

    /* Modal Pencarian */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(5px); }
    .modal-overlay.active { display: flex; animation: fadeIn 0.3s ease; }
    .search-content { display: flex; width: 100%; max-width: 500px; background: var(--bg-surface); border-radius: 50px; padding: 5px 5px 5px 20px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 20vh; }
    #search-input-modal { flex: 1; background: transparent; border: none; color: var(--text-main); font-size: 1rem; outline: none; }
    #search-btn-modal { background: var(--primary); color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
  `;
  document.head.appendChild(style);

  const viewHTML = `
    <!-- HALAMAN NONTON -->
    <div id="detail-view" class="d-none">
      <div class="detail-header">
        <button id="back-home-btn"><i class="fa-solid fa-arrow-left"></i></button>
        <h3 id="detail-title">Memuat...</h3>
        <button id="share-btn"><i class="fa-solid fa-share-nodes"></i></button>
      </div>
      
      <div class="player-wrapper">
        <div id="loading-overlay" class="loading-media">
           <i class="fa-solid fa-spinner fa-spin"></i>
           <p>Fetching Media</p>
           <span>Trying streaming servers...</span>
        </div>
        <iframe id="detail-iframe" allowfullscreen class="d-none"></iframe>
      </div>
      
      <div class="player-actions">
        <button><i class="fa-solid fa-lock"></i> Kunci Layar</button>
        <button><i class="fa-solid fa-expand"></i> Horizontal</button>
      </div>
      
      <div class="server-section">
        <h4><i class="fa-solid fa-server"></i> Pilih Server</h4>
        <div id="detail-server-grid" class="server-grid"></div>
        <p class="server-hint"><i class="fa-solid fa-circle-info"></i> Jika tidak bisa putar, coba server lain.</p>
      </div>
      
      <div class="movie-info-section">
        <h2 id="info-title">Memuat Judul...</h2>
        <div class="movie-meta-info">
          <span class="meta-type">Movie</span>
          <span id="info-year">HD</span>
          <span class="meta-rating"><i class="fa-solid fa-star"></i> <span id="info-rating">TBD</span></span>
        </div>
        <p id="info-synopsis" class="synopsis-text">Tengah mengambil detail film...</p>
      </div>
    </div>

    <!-- MODAL PENCARIAN -->
    <div id="search-modal" class="modal-overlay">
      <div class="search-content">
        <input type="text" id="search-input-modal" placeholder="Ketik judul film..." autocomplete="off">
        <button id="search-btn-modal"><i class="fa-solid fa-magnifying-glass"></i></button>
      </div>
    </div>
  `;
  
  // PERBAIKAN: Suntikkan ke BODY, bukan ke dalam 'main' (movie-container) agar tidak tertimpa/terhapus.
  document.body.insertAdjacentHTML('beforeend', viewHTML);
}
createDynamicViews();

// ==========================================
// 2. DEKLARASI ELEMEN DETAIL & SEARCH
// ==========================================
const detailView = document.getElementById('detail-view');
const detailIframe = document.getElementById('detail-iframe');
const loadingOverlay = document.getElementById('loading-overlay');
const detailTitle = document.getElementById('detail-title');
const detailServerGrid = document.getElementById('detail-server-grid');
const backHomeBtn = document.getElementById('back-home-btn');
const infoTitle = document.getElementById('info-title');

// Digunakan untuk menyembunyikan tulisan "Lagi Ramai Ditonton" & "Semua >" secara keseluruhan
const sectionTitleHome = document.querySelector('.section-title');
const sectionHeaderHome = document.querySelector('.section-header');

const searchModal = document.getElementById('search-modal');
const searchInputModal = document.getElementById('search-input-modal');
const searchBtnModal = document.getElementById('search-btn-modal');

// ==========================================
// 3. HELPER FETCH API
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
// 4. RENDER UI UTAMA (BERANDA)
// ==========================================
function renderMovies(movies, titleText = "Populer Minggu Ini") {
  if (sectionTitleHome) sectionTitleHome.querySelector('span').textContent = titleText;
  
  // Bersihkan movieContainer (sekarang aman karena searchModal sudah ada di luar kontainer ini)
  movieContainer.innerHTML = '';

  if (!movies || movies.length === 0) {
    movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;">Film tidak ditemukan.</p>';
    return;
  }

  const heroMovie = movies[0];
  if(heroBanner) {
      heroBanner.style.backgroundImage = `url('${heroMovie.thumbnail || 'https://via.placeholder.com/800x600?text=No+Image'}')`;
      document.getElementById('hero-title').textContent = heroMovie.title;
      
      const btnTontonHero = document.querySelector('.btn-tonton');
      if(btnTontonHero) {
        // Hapus event listener lama dengan melakukan cloning agar tidak dobel klik
        const newBtn = btnTontonHero.cloneNode(true);
        btnTontonHero.parentNode.replaceChild(newBtn, btnTontonHero);
        newBtn.addEventListener('click', () => openMovieDetail(heroMovie.slug));
      }
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${movie.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image'}" class="poster" alt="${movie.title}" loading="lazy">
      <div class="rating-badge"><i class="fa-solid fa-star"></i> -.-</div>
      <div class="card-title" title="${movie.title}">${movie.title}</div>
      <div class="card-year">HD</div>
    `;
    card.addEventListener('click', () => openMovieDetail(movie.slug));
    movieContainer.appendChild(card);
  });
}

// ==========================================
// 5. LOGIKA NAVIGASI HALAMAN (TOGGLE VIEWS)
// ==========================================
function toggleToDetailView() {
  if(heroBanner) heroBanner.classList.add('d-none');
  if(sectionHeaderHome) sectionHeaderHome.classList.add('d-none'); // Sembunyikan header secara utuh
  movieContainer.classList.add('d-none');
  detailView.classList.remove('d-none');
  window.scrollTo(0, 0); 
}

function toggleToHomeView() {
  detailIframe.src = ''; 
  detailView.classList.add('d-none');
  if(heroBanner) heroBanner.classList.remove('d-none');
  if(sectionHeaderHome) sectionHeaderHome.classList.remove('d-none');
  movieContainer.classList.remove('d-none');
}

backHomeBtn.addEventListener('click', toggleToHomeView);

// ==========================================
// 6. LOGIKA HALAMAN NONTON (OPEN DETAIL & LOADING)
// ==========================================
function showPlayerLoading() {
  loadingOverlay.classList.remove('d-none');
  detailIframe.classList.add('d-none');
}

function hidePlayerLoading() {
  loadingOverlay.classList.add('d-none');
  detailIframe.classList.remove('d-none');
}

detailIframe.addEventListener('load', () => {
  if (detailIframe.src && detailIframe.src !== window.location.href) {
    hidePlayerLoading();
  }
});

async function openMovieDetail(slug) {
  toggleToDetailView();
  detailTitle.textContent = 'Memuat Data...';
  infoTitle.textContent = 'Memuat Judul...';
  detailServerGrid.innerHTML = '<p class="server-hint">Mencari server...</p>';
  
  detailIframe.src = '';
  showPlayerLoading();

  const detail = await fetchAPI({ slug });

  if (detail && detail.serverPlayer && detail.serverPlayer.length > 0) {
    const mainTitle = detail.title || 'Nonton Film';
    detailTitle.textContent = mainTitle;
    infoTitle.textContent = mainTitle;
    
    document.getElementById('info-synopsis').textContent = detail.synopsis || `Menonton film ${mainTitle} dengan kualitas HD. Silakan pilih server di atas jika video lambat atau tidak dapat diputar.`;
    
    detailServerGrid.innerHTML = '';
    detail.serverPlayer.forEach((srv, index) => {
      const btn = document.createElement('button');
      btn.className = `server-btn-grid ${index === 0 ? 'active' : ''}`;
      
      btn.innerHTML = `
        <div style="display:flex; align-items:center;">
            <span class="dot"></span> ${srv.server}
        </div>
      `;
      
      btn.addEventListener('click', () => {
        document.querySelectorAll('.server-btn-grid').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showPlayerLoading();
        detailIframe.src = srv.embed;
      });
      detailServerGrid.appendChild(btn);
    });

    detailIframe.src = detail.serverPlayer[0].embed;
  } else {
    detailTitle.textContent = 'Video Tidak Tersedia';
    infoTitle.textContent = 'Data tidak ditemukan';
    detailServerGrid.innerHTML = '<p class="server-hint" style="color:red;">Tidak ada server aktif.</p>';
    loadingOverlay.innerHTML = '<p style="color:red;">Video Tidak Ditemukan</p>';
  }
}

// ==========================================
// 7. LOGIKA LOAD & PENCARIAN (MODAL SEARCH)
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

async function executeSearch(query) {
  movieContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari film...</p>';
  const movies = await fetchAPI({ action: 'search', query });
  renderMovies(movies, `Hasil: "${query}"`);
}

// Logika klik tombol Search di Atas Header
searchIcons.forEach(icon => {
  icon.parentElement.addEventListener('click', (e) => {
    e.preventDefault();
    searchModal.classList.add('active');
    searchInputModal.value = '';
    setTimeout(() => searchInputModal.focus(), 100);
  });
});

function triggerSearch() {
  const query = searchInputModal.value.trim();
  if (query !== '') {
    toggleToHomeView(); 
    executeSearch(query);
    searchModal.classList.remove('active');
  }
}

searchBtnModal.addEventListener('click', triggerSearch);
searchInputModal.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') triggerSearch();
});

// Fitur tutup modal jika luar kotak diclick
window.addEventListener('click', (e) => {
  if (e.target === searchModal) {
    searchModal.classList.remove('active');
  }
});

// LOGIKA NAVIGASI BAWAH
navItems.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = btn.querySelector('span').textContent.toLowerCase();
    
    if(text !== 'cari' && text !== 'simpan') {
      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    if (text === 'beranda') { 
      toggleToHomeView(); loadHome(); 
    }
    else if (text === 'trending') { 
      toggleToHomeView(); loadRating(); 
    }
    else if (text === 'cari') { 
      searchModal.classList.add('active');
      searchInputModal.value = '';
      setTimeout(() => searchInputModal.focus(), 100);
    }
    else if (text === 'simpan') {
      alert("Fitur Simpan (Bookmark) akan segera hadir!");
    }
  });
});

// ==========================================
// INISIALISASI AWAL
// ==========================================
loadHome();
