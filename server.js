const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Cache files
const NEWS_CACHE_FILE = path.join(dataDir, 'news_cache.json');
const VIDEOS_CACHE_FILE = path.join(dataDir, 'video_cache.json');
const PAPERS_CACHE_FILE = path.join(dataDir, 'papers_cache.json');

// Cache metadata
const CACHE_METADATA_FILE = path.join(dataDir, 'cache_metadata.json');

// Load cache metadata
let cacheMetadata = {
  lastUpdate: null,
  news: { lastUpdate: null, totalPages: 0 },
  videos: { lastUpdate: null, totalPages: 0 },
  papers: { lastUpdate: null, totalPages: 0 }
};

try {
  if (fs.existsSync(CACHE_METADATA_FILE)) {
    cacheMetadata = JSON.parse(fs.readFileSync(CACHE_METADATA_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load cache metadata:', e.message);
}

// Load cache from disk on startup
let cachedNews = [];
let cachedVideos = [];
let cachedPapers = [];

try {
  if (fs.existsSync(NEWS_CACHE_FILE)) {
    cachedNews = JSON.parse(fs.readFileSync(NEWS_CACHE_FILE, 'utf8'));
  }
} catch (e) { 
  console.warn('Could not load news cache:', e.message);
  cachedNews = []; 
}

try {
  if (fs.existsSync(VIDEOS_CACHE_FILE)) {
    cachedVideos = JSON.parse(fs.readFileSync(VIDEOS_CACHE_FILE, 'utf8'));
  }
} catch (e) { 
  console.warn('Could not load videos cache:', e.message);
  cachedVideos = []; 
}

try {
  if (fs.existsSync(PAPERS_CACHE_FILE)) {
    cachedPapers = JSON.parse(fs.readFileSync(PAPERS_CACHE_FILE, 'utf8'));
  }
} catch (e) { 
  console.warn('Could not load papers cache:', e.message);
  cachedPapers = []; 
}

// Add this after the cache metadata loading
console.log('Cache Status:', {
  news: {
    lastUpdate: cacheMetadata.news.lastUpdate,
    totalPages: cacheMetadata.news.totalPages,
    itemsCount: cachedNews.length
  },
  videos: {
    lastUpdate: cacheMetadata.videos.lastUpdate,
    totalPages: cacheMetadata.videos.totalPages,
    itemsCount: cachedVideos.length
  },
  papers: {
    lastUpdate: cacheMetadata.papers.lastUpdate,
    totalPages: cacheMetadata.papers.totalPages,
    itemsCount: cachedPapers.length
  }
});

// Helper function to check if cache needs update
function needsUpdate(type) {
  const lastUpdate = cacheMetadata[type].lastUpdate;
  if (!lastUpdate) return true;
  
  const now = new Date();
  const lastUpdateDate = new Date(lastUpdate);
  const hoursSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60);
  
  // Update if more than 1 hour old
  return hoursSinceUpdate >= 1;
}

// Helper function to save cache metadata
function saveCacheMetadata() {
  fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(cacheMetadata, null, 2));
}

// Add rate limit tracking
const rateLimits = {
  gnews: {
    callsToday: 0,
    lastReset: new Date(),
    maxCallsPerDay: 100
  },
  youtube: {
    unitsToday: 0,
    lastReset: new Date(),
    maxUnitsPerDay: 10000
  }
};

// Add rate limit check function
function checkRateLimits(type) {
  const now = new Date();
  
  // Reset counters if it's a new day
  if (now.getDate() !== rateLimits[type].lastReset.getDate()) {
    rateLimits[type].callsToday = 0;
    rateLimits[type].unitsToday = 0;
    rateLimits[type].lastReset = now;
  }
  
  if (type === 'gnews') {
    if (rateLimits.gnews.callsToday >= rateLimits.gnews.maxCallsPerDay) {
      console.warn('GNews API rate limit reached for today');
      return false;
    }
    rateLimits.gnews.callsToday += 3; // 3 calls per update
  } else if (type === 'youtube') {
    if (rateLimits.youtube.unitsToday >= rateLimits.youtube.maxUnitsPerDay) {
      console.warn('YouTube API rate limit reached for today');
      return false;
    }
    rateLimits.youtube.unitsToday += 300; // 300 units per update
  }
  
  return true;
}

// News API endpoint
app.get('/api/news', async (req, res) => {
  if (!process.env.GNEWS_API_KEY) {
    return res.status(500).json({ error: 'GNews API key not configured' });
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Check if we need to update the cache
  if (needsUpdate('news')) {
    console.log('Updating news cache...');
    try {
      // Check rate limits before making API calls
      if (!checkRateLimits('gnews')) {
        console.log('Using cached news data due to rate limits');
      } else {
        // Fetch multiple pages of news to get more content
        const newsPromises = [];
        for (let i = 1; i <= 3; i++) {
          const url = `https://gnews.io/api/v4/search?q=ai&lang=en&max=50&page=${i}&token=${process.env.GNEWS_API_KEY}`;
          newsPromises.push(fetch(url).then(res => res.json()));
        }

        const results = await Promise.all(newsPromises);
        let articles = [];
        
        // Combine articles from all pages
        results.forEach(result => {
          if (result.articles && result.articles.length > 0) {
            articles = articles.concat(result.articles.map(article => ({
              ...article,
              image: article.image || article.urlToImage || `https://picsum.photos/200/120?random=${Math.random()}`
            })));
          }
        });

        // Remove duplicates based on URL
        articles = articles.filter((article, index, self) =>
          index === self.findIndex((a) => a.url === article.url)
        );

        if (articles.length > 0) {
          cachedNews = articles;
          fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify(cachedNews));
          cacheMetadata.news.lastUpdate = new Date().toISOString();
          cacheMetadata.news.totalPages = Math.ceil(articles.length / pageSize);
          saveCacheMetadata();
          console.log(`News cache updated with ${articles.length} articles`);
        }
      }
    } catch (error) {
      console.error('News API error:', error.message);
    }
  } else {
    console.log('Using cached news data');
  }

  // Return paginated results
  const paginatedArticles = cachedNews.slice(startIndex, endIndex);
  res.json({
    articles: paginatedArticles,
    totalPages: cacheMetadata.news.totalPages,
    currentPage: page,
    fromCache: !needsUpdate('news'),
    rateLimitStatus: {
      callsToday: rateLimits.gnews.callsToday,
      maxCallsPerDay: rateLimits.gnews.maxCallsPerDay
    }
  });
});

// Videos API endpoint
app.get('/api/videos', async (req, res) => {
  if (!process.env.YT_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Check if we need to update the cache
  if (needsUpdate('videos')) {
    console.log('Updating videos cache...');
    try {
      // Check rate limits before making API calls
      if (!checkRateLimits('youtube')) {
        console.log('Using cached videos data due to rate limits');
      } else {
        const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers
        const publishedAfter = new Date();
        publishedAfter.setDate(publishedAfter.getDate() - 7); // 7 days ago
        const publishedAfterISO = publishedAfter.toISOString();

        // Fetch multiple pages of videos
        const videoPromises = [];
        let nextPageToken = null;
        
        for (let i = 0; i < 3; i++) {
          let url = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YT_API_KEY}&channelId=${channelId}&part=snippet&type=video&maxResults=50&order=date&publishedAfter=${publishedAfterISO}`;
          if (nextPageToken) {
            url += `&pageToken=${nextPageToken}`;
          }
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`YouTube API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          if (data.items) {
            videoPromises.push(...data.items);
          }
          
          nextPageToken = data.nextPageToken;
          if (!nextPageToken) break;
        }

        // Filter videos from the last 7 days
        const filteredItems = videoPromises.filter(item => {
          const publishedAt = new Date(item.snippet.publishedAt);
          return publishedAt >= publishedAfter;
        });

        // Remove duplicates
        const uniqueItems = filteredItems.filter((item, index, self) =>
          index === self.findIndex((i) => i.id.videoId === item.id.videoId)
        );

        if (uniqueItems.length > 0) {
          cachedVideos = uniqueItems;
          fs.writeFileSync(VIDEOS_CACHE_FILE, JSON.stringify(cachedVideos));
          cacheMetadata.videos.lastUpdate = new Date().toISOString();
          cacheMetadata.videos.totalPages = Math.ceil(uniqueItems.length / pageSize);
          saveCacheMetadata();
          console.log(`Videos cache updated with ${uniqueItems.length} videos`);
        }
      }
    } catch (error) {
      console.error('Videos API error:', error.message);
    }
  } else {
    console.log('Using cached videos data');
  }

  // Return paginated results
  const paginatedVideos = cachedVideos.slice(startIndex, endIndex);
  res.json({
    items: paginatedVideos,
    totalPages: cacheMetadata.videos.totalPages,
    currentPage: page,
    fromCache: !needsUpdate('videos'),
    rateLimitStatus: {
      unitsToday: rateLimits.youtube.unitsToday,
      maxUnitsPerDay: rateLimits.youtube.maxUnitsPerDay
    }
  });
});

// Research Papers API endpoint
app.get('/api/papers', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Check if we need to update the cache
  if (needsUpdate('papers')) {
    console.log('Updating papers cache...');
    try {
      const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=lastUpdatedDate&sortOrder=descending&max_results=50';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`arXiv API responded with status: ${response.status}`);
      }
      
      const data = await response.text();
      const parser = new xml2js.Parser();
      
      parser.parseString(data, (err, result) => {
        if (err) {
          throw new Error('Failed to parse arXiv XML response');
        }
        
        const entries = result.feed.entry || [];
        const papers = entries.map(entry => ({
          title: entry.title[0],
          abstract: entry.summary[0],
          url: entry.id[0],
          published: entry.published[0],
          authors: entry.author.map(author => author.name[0])
        }));
        
        if (papers.length > 0) {
          cachedPapers = papers;
          fs.writeFileSync(PAPERS_CACHE_FILE, JSON.stringify(cachedPapers));
          cacheMetadata.papers.lastUpdate = new Date().toISOString();
          cacheMetadata.papers.totalPages = Math.ceil(papers.length / pageSize);
          saveCacheMetadata();
          console.log(`Papers cache updated with ${papers.length} papers`);
        }
      });
    } catch (error) {
      console.error('Papers API error:', error.message);
    }
  } else {
    console.log('Using cached papers data');
  }

  // Return paginated results
  const paginatedPapers = cachedPapers.slice(startIndex, endIndex);
  res.json({
    papers: paginatedPapers,
    totalPages: cacheMetadata.papers.totalPages,
    currentPage: page,
    fromCache: !needsUpdate('papers')
  });
});

// Summary API endpoint
app.post('/api/summarize', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { content, type } = req.body;
  if (!content || !type) {
    return res.status(400).json({ error: 'Content and type are required' });
  }

  try {
    const prompt = `Summarize this ${type} in a concise way:\n\n${content}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes content concisely.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    res.json({ summary });
  } catch (error) {
    console.error('Summary generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Cache status endpoint
app.get('/api/cache-status', (req, res) => {
  const now = new Date();
  const status = {
    news: {
      lastUpdate: cacheMetadata.news.lastUpdate,
      nextUpdate: new Date(new Date(cacheMetadata.news.lastUpdate).getTime() + 24 * 60 * 60 * 1000),
      totalPages: cacheMetadata.news.totalPages,
      itemsCount: cachedNews.length,
      needsUpdate: needsUpdate('news')
    },
    videos: {
      lastUpdate: cacheMetadata.videos.lastUpdate,
      nextUpdate: new Date(new Date(cacheMetadata.videos.lastUpdate).getTime() + 24 * 60 * 60 * 1000),
      totalPages: cacheMetadata.videos.totalPages,
      itemsCount: cachedVideos.length,
      needsUpdate: needsUpdate('videos')
    },
    papers: {
      lastUpdate: cacheMetadata.papers.lastUpdate,
      nextUpdate: new Date(new Date(cacheMetadata.papers.lastUpdate).getTime() + 24 * 60 * 60 * 1000),
      totalPages: cacheMetadata.papers.totalPages,
      itemsCount: cachedPapers.length,
      needsUpdate: needsUpdate('papers')
    }
  };
  res.json(status);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Keys configured:', {
    gnews: !!process.env.GNEWS_API_KEY,
    youtube: !!process.env.YT_API_KEY,
    openai: !!process.env.OPENAI_API_KEY
  });
}); 