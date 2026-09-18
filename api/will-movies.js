const axios = require('axios');

const OMDB_API_KEY = '32ec55d1';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

// Helper Format Respons
function formatResponse(status, code, dataOrMessage) {
  const isSuccess = status === 'success';
  return {
    status,
    code,
    creator: '@xaerisoftDev',
    [isSuccess ? 'data' : 'message']: dataOrMessage
  };
}

// 1. Ambil daftar film dari OMDb
async function getMoviesByKeyword(keyword) {
  try {
    const res = await axios.get(`${OMDB_BASE_URL}?s=${encodeURIComponent(keyword)}&type=movie&apikey=${OMDB_API_KEY}`);
    if (res.data.Response === 'True') {
      return res.data.Search.map(item => ({
        title: item.Title,
        thumbnail: item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
        url: `https://www.imdb.com/title/${item.imdbID}/`,
        slug: item.imdbID
      }));
    }
    return [];
  } catch (err) {
    return [];
  }
}

// 2. Detail Film & Server Pemutar Video (Embed IMDb ID)
async function getMovieDetails(imdbID) {
  try {
    const res = await axios.get(`${OMDB_BASE_URL}?i=${imdbID}&plot=full&apikey=${OMDB_API_KEY}`);
    const data = res.data;

    if (data.Response === 'False') {
      return formatResponse('error', 404, 'Film tidak ditemukan');
    }

    // Pemutar video otomatis menggunakan IMDb ID
    const serverPlayer = [
      { server: 'Server Utama', embed: `https://vidsrc.to/embed/movie/${imdbID}` },
      { server: 'Server Cadangan 1', embed: `https://www.2embed.cc/embed/${imdbID}` },
      { server: 'Server Cadangan 2', embed: `https://autoembed.co/movie/imdb/${imdbID}` }
    ];

    return formatResponse('success', 200, {
      title: `${data.Title} (${data.Year})`,
      thumbnail: data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
      description: data.Plot !== 'N/A' ? data.Plot : 'Tidak ada deskripsi.',
      rating: data.imdbRating !== 'N/A' ? data.imdbRating : 'N/A',
      serverPlayer
    });
  } catch (err) {
    return formatResponse('error', 500, err.message);
  }
}

// Handler Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, query, slug } = req.query || {};
  let result;

  if (action === 'home') {
    // Menampilkan kumpulan film populer di halaman utama
    const movies = await getMoviesByKeyword('Avengers');
    result = formatResponse('success', 200, movies);
  } else if (action === 'rating') {
    // Menampilkan daftar film populer pilihan
    const movies = await getMoviesByKeyword('Batman');
    result = formatResponse('success', 200, movies);
  } else if (action === 'search' && query) {
    // Pencarian film berdasarkan kata kunci dari input user
    const movies = await getMoviesByKeyword(query);
    result = formatResponse('success', 200, movies);
  } else if (slug) {
    // Ambil detail film & link streaming berdasarkan IMDb ID
    result = await getMovieDetails(slug);
  } else {
    const movies = await getMoviesByKeyword('Spider-Man');
    result = formatResponse('success', 200, movies);
  }

  return res.status(result.code || 200).json(result);
};
