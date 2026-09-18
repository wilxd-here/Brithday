const axios = require('axios'); // Membutuhkan axios yang sudah ada di package.json

// Mengambil API Key dari Environment Variable Vercel
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

// Helper: Format respons JSON agar cocok dengan app.js
function formatResponse(status, code, dataOrMessage) {
  const isSuccess = status === 'success';
  return {
    status,
    code,
    creator: '@xaerisoftDev',
    [isSuccess ? 'data' : 'message']: dataOrMessage
  };
}

// Helper: Ubah format data TMDB agar sesuai dengan struktur yang dibaca frontend
function mapMovies(results) {
  return results.map(movie => ({
    title: movie.title,
    thumbnail: movie.poster_path ? `${TMDB_IMG_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
    slug: movie.id.toString() // Menggunakan ID TMDB sebagai slug untuk mengambil detail nanti
  }));
}

// Handler Vercel Serverless Function
module.exports = async (req, res) => {
  // Izinkan akses CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, query, slug, page = 1 } = req.query || {};

  // Cek apakah API Key sudah dipasang di Vercel
  if (!TMDB_API_KEY) {
    return res.status(500).json(formatResponse('error', 500, 'TMDB API Key belum diatur di Vercel!'));
  }

  try {
    // 1. Endpoint Home (Film Populer)
    if (action === 'home') {
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=id-ID&page=${page}`);
      return res.json(formatResponse('success', 200, mapMovies(data.results)));
    } 
    
    // 2. Endpoint Rating Terbaik (Top Rated)
    else if (action === 'rating') {
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=id-ID&page=${page}`);
      return res.json(formatResponse('success', 200, mapMovies(data.results)));
    } 
    
    // 3. Endpoint Search (Pencarian Film)
    else if (action === 'search' && query) {
      const { data } = await axios.get(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=id-ID&query=${encodeURIComponent(query)}&page=${page}`);
      return res.json(formatResponse('success', 200, mapMovies(data.results)));
    } 
    
    // 4. Endpoint Detail & Stream Server
    else if (slug) {
      // Ambil detail film dari TMDB berdasarkan ID (slug)
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/${slug}?api_key=${TMDB_API_KEY}&language=id-ID`);
      
      // Karena TMDB tidak menyediakan video film, kita generate iframe dari penyedia embed pihak ketiga
      const tmdbId = data.id;
      const serverPlayer = [
        { server: 'VidSrc', embed: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}` },
        { server: 'SuperEmbed', embed: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` },
        { server: '2Embed', embed: `https://www.2embed.cc/embed/${tmdbId}` }
      ];

      // Format detail agar sesuai dengan yang diminta app.js
      return res.json(formatResponse('success', 200, {
        title: data.title,
        thumbnail: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : '',
        description: data.overview,
        rating: data.vote_average,
        serverPlayer
      }));
    } 
    
    // Fallback default
    else {
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=id-ID&page=1`);
      return res.json(formatResponse('success', 200, mapMovies(data.results)));
    }

  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json(formatResponse('error', 500, 'Gagal mengambil data dari server TMDB.'));
  }
};
