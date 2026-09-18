const axios = require('axios');

// Menggunakan TMDB API (Gratis, Resmi, & Otomatis Memfilter Konten Dewasa)
const TMDB_API_KEY = process.env.TMDB_API_KEY || '15d2ea6d0dc1d476efbca3ecc92bfe30'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function formatResponse(status, code, dataOrMessage) {
  const isSuccess = status === 'success';
  return {
    status,
    code,
    creator: '@xaerisoftDev',
    [isSuccess ? 'data' : 'message']: dataOrMessage
  };
}

// Daftar pemutar video streaming berdasarkan TMDB ID
function getStreamServers(tmdbId) {
  return [
    { server: 'Server 1 (VidSrc)', embed: `https://vidsrc.to/embed/movie/${tmdbId}` },
    { server: 'Server 2 (Autoembed)', embed: `https://player.autoembed.cc/embed/movie/${tmdbId}` },
    { server: 'Server 3 (Embed.su)', embed: `https://embed.su/embed/movie/${tmdbId}` },
    { server: 'Server 4 (VidLink)', embed: `https://vidlink.pro/movie/${tmdbId}` },
    { server: 'Server 5 (2Embed)', embed: `https://www.2embed.cc/embed/${tmdbId}` }
  ];
}

// 1. Endpoint Home (Film Populer & Bebas Dewasa)
async function getHome() {
  try {
    const url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&include_adult=false`;
    const { data } = await axios.get(url);
    const movies = data.results.map(m => ({
      title: m.title || m.original_title,
      thumbnail: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      slug: m.id.toString(),
      rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A'
    }));
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 2. Endpoint Best Rating
async function getBestRating() {
  try {
    const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&include_adult=false`;
    const { data } = await axios.get(url);
    const movies = data.results.map(m => ({
      title: m.title || m.original_title,
      thumbnail: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      slug: m.id.toString(),
      rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A'
    }));
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 3. Endpoint Search
async function searchMovies(query) {
  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
    const { data } = await axios.get(url);
    const movies = data.results.map(m => ({
      title: m.title || m.original_title,
      thumbnail: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      slug: m.id.toString(),
      rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A'
    }));
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 4. Endpoint Detail & Pemutar Video
async function getMovieDetails(id) {
  try {
    const url = `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`;
    const { data } = await axios.get(url);
    return formatResponse('success', 200, {
      title: data.title || data.original_title,
      thumbnail: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : '',
      description: data.overview || '',
      rating: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
      tmdbId: data.id,
      serverPlayer: getStreamServers(data.id)
    });
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// Handler Vercel / Netlify Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, query, q, keyword, slug, id } = req.query || {};
  const searchKeyword = query || q || keyword;
  const movieId = slug || id;

  let result;

  if (action === 'search' || searchKeyword) {
    result = await searchMovies(searchKeyword);
  } else if (action === 'detail' || (movieId && action !== 'home')) {
    result = await getMovieDetails(movieId);
  } else if (action === 'top-rated' || action === 'rating') {
    result = await getBestRating();
  } else {
    result = await getHome(); // Untuk popular, latest, dan home
  }

  return res.status(result.code || 200).json(result);
};
