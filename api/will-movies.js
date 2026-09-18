const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://americaenmipiel.org';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

// Helper: Format respons JSON
function formatResponse(status, code, dataOrMessage) {
  const isSuccess = status === 'success';
  return {
    status,
    code,
    creator: '@xaerisoftDev',
    [isSuccess ? 'data' : 'message']: dataOrMessage
  };
}

// Helper: Parsing daftar film
function parseMovieList($) {
  const movies = [];
  $('article.item-infinite, .gmr-box-content article, article.post').each((_, element) => {
    const $el =$(element);
    const title = $el.find('.entry-title a').text().trim() \vert{}\vert{}$el.find('img').attr('alt')?.trim();
    const url = $el.find('.entry-title a').attr('href') \vert{}\vert{}$el.find('a').attr('href');
    const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src') \vert{}\vert{}$el.find('img').attr('data-srcset');

    if (url && title) {
      const pathname = new URL(url).pathname;
      const slug = pathname.replace(/^\/|\/$/g, '');
      movies.push({ title, thumbnail, url, slug });
    }
  });
  return movies;
}

// 1. Endpoint Home
async function getHome(minResults = 30) {
  try {
    let movies = [];
    let page = 1;
    while (movies.length < minResults && page <= 5) {
      const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`;
      const { data } = await axios.get(url, { headers });
      const $ = cheerio.load(data);
      const parsed = parseMovieList($);
      if (parsed.length === 0) break;
      parsed.forEach(item => {
        if (!movies.some(m => m.slug === item.slug)) movies.push(item);
      });
      page++;
    }
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 2. Endpoint Best Rating
async function getBestRating(page = 1) {
  try {
    const url = page > 1 ? `${BASE_URL}/best-rating/page/${page}/` : `${BASE_URL}/best-rating/`;
    const { data } = await axios.get(url, { headers });
    const movies = parseMovieList(cheerio.load(data));
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 3. Endpoint Search
async function searchMovies(query, page = 1) {
  try {
    const searchUrl = page > 1 
      ? `${BASE_URL}/page/${page}/?s=${encodeURIComponent(query)}&post_type[]=post&post_type[]=tv`
      : `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type[]=post&post_type[]=tv`;
    const { data } = await axios.get(searchUrl, { headers });
    const movies = parseMovieList(cheerio.load(data));
    return formatResponse('success', 200, movies);
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// 4. Endpoint Detail & Stream Server
async function getMovieDetails(slugOrUrl) {
  try {
    const targetUrl = slugOrUrl.startsWith('http') 
      ? slugOrUrl 
      : `${BASE_URL}/${slugOrUrl.replace(/^\/|\/$/g, '')}/`;

    const { data } = await axios.get(targetUrl, { headers: { ...headers, Referer: targetUrl } });
    const $ = cheerio.load(data);

    const title = $('h1.entry-title').text().trim() || $('meta[property="og:title"]').attr('content') \vert{}\vert{} $('title').text().trim();
    const thumbnail = $('.gmr-movie-data img').attr('src') \vert{}\vert{}$('meta[property="og:image"]').attr('content');
    const description = $('.entry-content.entry-content-single p').first().text().trim() \vert{}\vert{}$('meta[property="og:description"]').attr('content');
    const rating = $('span[itemprop="ratingValue"]').text().trim() \vert{}\vert{} $('.gmr-meta-rating').text().trim().match(/\d+(\.\d+)?/)?.[0] || 'N/A';

    const serverPlayer = [];
    const serverTabs = $('ul.muvipro-player-tabs li a');

    if (serverTabs.length > 0) {
      for (let i = 0; i < serverTabs.length; i++) {
        const tab = $(serverTabs[i]);
        const serverName = tab.text().trim() || `Server ${i + 1}`;
        let serverHref = tab.attr('href');

        if (!serverHref) continue;
        if (serverHref.startsWith('/')) serverHref = `${BASE_URL}${serverHref}`;

        if (i === 0 || serverHref === targetUrl) {
          const iframeSrc = $('.gmr-embed-responsive iframe').attr('src');
          if (iframeSrc) serverPlayer.push({ server: serverName, embed: iframeSrc });
        } else {
          try {
            const serverRes = await axios.get(serverHref, { headers });
            const $server = cheerio.load(serverRes.data);
            const iframeSrc = $server('.gmr-embed-responsive iframe').attr('src');
            if (iframeSrc) serverPlayer.push({ server: serverName, embed: iframeSrc });
          } catch (err) {
            console.error(`Gagal mengambil ${serverName}:`, err.message);
          }
        }
      }
    } else {
      $('iframe').each((_, element) => {
        const src = $(element).attr('src') \vert{}\vert{}$(element).attr('data-src');
        if (src && !src.includes('facebook') && !src.includes('twitter')) {
          serverPlayer.push({ server: 'Server 1', embed: src.startsWith('//') ? `https:${src}` : src });
        }
      });
    }

    return formatResponse('success', 200, {
      title,
      thumbnail,
      description,
      rating,
      serverPlayer
    });
  } catch (error) {
    return formatResponse('error', 500, error.message);
  }
}

// Handler Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, query, slug, page } = req.query || {};
  let result;

  if (action === 'home') {
    result = await getHome(30);
  } else if (action === 'rating') {
    result = await getBestRating(page || 1);
  } else if (action === 'search' && query) {
    result = await searchMovies(query, page || 1);
  } else if (slug) {
    result = await getMovieDetails(slug);
  } else {
    result = await getHome(30);
  }

  return res.status(result.code || 200).json(result);
};
