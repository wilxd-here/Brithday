const API_BASE_URL = '/api/will-movies';

// Elemen Utama
const homeView = document.getElementById('home-view');
const detailView = document.getElementById('detail-view');
const movieListEl = document.getElementById('movie-list');
const sectionTitle = document.getElementById('section-title');

// 1. FUNGSI AMBIL DAFTAR FILM (HOME / POPULER)
async function loadHome() {
  homeView.style.display = 'block';
  detailView.style.display = 'none';
  sectionTitle.textContent = 'Film Populer';
  movieListEl.innerHTML = 'Memuat data...';

  try {
    const response = await fetch(`${API_BASE_URL}?action=home`);
    const result = await response.json();
    renderMovies(result.data);
  } catch (error) {
    movieListEl.innerHTML = 'Gagal memuat film.';
  }
}

// 2. FUNGSI PENCARIAN FILM
async function searchMovies() {
  const query = document.getElementById('search-input').value;
  if (!query) return;

  homeView.style.display = 'block';
  detailView.style.display = 'none';
  sectionTitle.textContent = `Hasil pencarian: "${query}"`;
  movieListEl.innerHTML = 'Mencari...';

  try {
    const response = await fetch(`${API_BASE_URL}?action=search&query=${encodeURIComponent(query)}`);
    const result = await response.json();
    renderMovies(result.data);
  } catch (error) {
    movieListEl.innerHTML = 'Gagal mencari film.';
  }
}

// 3. FUNGSI RENDER DAFTAR FILM KE HTML
function renderMovies(movies) {
  movieListEl.innerHTML = '';
  if (!movies || movies.length === 0) {
    movieListEl.innerHTML = 'Film tidak ditemukan.';
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    // Saat film diklik, panggil fungsi loadMovieDetail membawa ID (slug)
    card.onclick = () => loadMovieDetail(movie.slug); 
    
    card.innerHTML = `
      <img src="${movie.thumbnail}" alt="${movie.title}" loading="lazy">
      <h4>${movie.title}</h4>
    `;
    movieListEl.appendChild(card);
  });
}

// 4. FUNGSI HALAMAN NONTON (DETAIL & IFRAME)
async function loadMovieDetail(slug) {
  // Sembunyikan Home, Tampilkan Detail
  homeView.style.display = 'none';
  detailView.style.display = 'block';
  
  // Kosongkan isi sebelumnya biar nggak numpuk
  document.getElementById('video-wrapper').innerHTML = 'Memuat video...';
  document.getElementById('server-list').innerHTML = '';
  document.getElementById('movie-title').textContent = 'Memuat...';
  document.getElementById('movie-desc').textContent = '';
  document.getElementById('movie-rating').textContent = '';

  try {
    const response = await fetch(`${API_BASE_URL}?slug=${slug}`);
    const result = await response.json();

    if (result.status === 'success') {
      const detail = result.data;
      const servers = detail.serverPlayer;

      // Isi Teks Detail
      document.getElementById('movie-title').textContent = detail.title;
      document.getElementById('movie-desc').textContent = detail.description;
      document.getElementById('movie-rating').textContent = detail.rating;

      // Pasang Iframe Video (Default Server 1)
      const videoWrapper = document.getElementById('video-wrapper');
      videoWrapper.innerHTML = `<iframe id="movie-iframe" src="${servers[0].embed}" allowfullscreen></iframe>`;

      // Buat Tombol Ganti Server
      const serverList = document.getElementById('server-list');
      servers.forEach((srv, index) => {
        const btn = document.createElement('button');
        btn.textContent = srv.server;
        btn.className = index === 0 ? 'server-btn active' : 'server-btn';
        
        btn.onclick = () => {
          document.getElementById('movie-iframe').src = srv.embed; // Ganti link iframe
          document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active'); // Ubah warna tombol
        };
        serverList.appendChild(btn);
      });
    }
  } catch (error) {
    document.getElementById('video-wrapper').innerHTML = 'Gagal memuat video.';
  }
}

// Jalankan otomatis saat web pertama kali dibuka
loadHome();
