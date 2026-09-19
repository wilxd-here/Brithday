const API_BASE_URL = '/api/will-movies';

// Tunggu sampai elemen HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  loadMovies();
});

async function loadMovies() {
  const container = document.getElementById('movie-container');
  const heroTitle = document.getElementById('hero-title');
  
  // Tampilkan loading di grid bawah
  container.innerHTML = '<p style="padding: 20px; color: var(--text-muted);">Sedang mengambil film...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}?action=home`);
    const result = await response.json();

    if (result.status === 'success' && result.data.length > 0) {
      const movies = result.data;
      
      // 1. Render Banner Atas (Hero) pakai film pertama
      renderHeroBanner(movies[0]);
      
      // 2. Render sisanya di Grid Bawah
      renderMovieGrid(movies);
    } else {
      heroTitle.textContent = 'Data Kosong';
      container.innerHTML = '<p>Tidak ada film ditemukan.</p>';
    }
  } catch (error) {
    heroTitle.textContent = 'Gagal Memuat';
    container.innerHTML = '<p style="color: red;">Gagal terhubung ke server.</p>';
  }
}

function renderHeroBanner(movie) {
  const heroBanner = document.getElementById('hero-banner');
  const heroTitle = document.getElementById('hero-title');
  
  // Ubah background dan judul
  heroBanner.style.backgroundImage = `url('${movie.thumbnail}')`;
  heroTitle.textContent = movie.title;
  
  // Aksi tombol Tonton
  const btnTonton = document.querySelector('.btn-tonton');
  btnTonton.onclick = () => alert(`Fitur nonton belum dibuat di UI baru ini. (ID: ${movie.slug})`);
}

function renderMovieGrid(movies) {
  const container = document.getElementById('movie-container');
  container.innerHTML = ''; // Kosongkan loading

  movies.forEach(movie => {
    // Buat elemen card baru
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    // Nanti ini dipakai untuk membuka halaman player
    card.onclick = () => alert(`Kamu mengklik film: ${movie.title}`);

    card.innerHTML = `
      <img src="${movie.thumbnail}" class="poster" alt="${movie.title}" loading="lazy">
      <div class="rating-badge"><i class="fa-solid fa-star"></i> HD</div>
      <h3 class="card-title">${movie.title}</h3>
      <p class="card-year">Terbaru</p>
    `;
    
    container.appendChild(card);
  });
}
