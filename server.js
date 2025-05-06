const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
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
app.use(express.static('.'));

// Cache files
const NEWS_CACHE_FILE = path.join(dataDir, 'news_cache.json');
const VIDEOS_CACHE_FILE = path.join(dataDir, 'video_cache.json');

// Load cache from disk on startup
let cachedNews = [];
let cachedVideos = [];
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

// News API endpoint
app.get('/api/news', async (req, res) => {
  if (!process.env.GNEWS_API_KEY) {
    return res.status(500).json({ error: 'GNews API key not configured' });
  }

  const url = `https://gnews.io/api/v4/search?q=ai&lang=en&max=10&token=${process.env.GNEWS_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GNews API responded with status: ${response.status}`);
    }
    const data = await response.json();
    let articles = (data.articles && data.articles.length > 0) ? data.articles : [];
    if (articles.length > 0) {
      cachedNews = articles;
      fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify(cachedNews));
    }
    res.json({ articles });
  } catch (error) {
    console.error('News API error:', error.message);
    if (cachedNews.length > 0) {
      res.json({ articles: cachedNews });
    } else {
      res.status(500).json({ error: 'Failed to fetch news and no cached data available' });
    }
  }
});

// Videos API endpoint
app.get('/api/videos', async (req, res) => {
  if (!process.env.YT_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const category = req.query.category || 'all';
  let videos = [];
  try {
    const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers
    const url = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YT_API_KEY}&channelId=${channelId}&part=snippet&type=video&maxResults=3`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API responded with status: ${response.status}`);
    }
    const data = await response.json();
    if (data.items) videos.push(...data.items);
    
    if (category !== 'all') {
      videos = videos.filter(v => 
        v.snippet.title.toLowerCase().includes(category) || 
        v.snippet.description.toLowerCase().includes(category)
      );
    }
    
    if (videos.length > 0) {
      cachedVideos = videos;
      fs.writeFileSync(VIDEOS_CACHE_FILE, JSON.stringify(cachedVideos));
    }
    res.json({ items: videos });
  } catch (error) {
    console.error('Videos API error:', error.message);
    if (cachedVideos.length > 0) {
      res.json({ items: cachedVideos });
    } else {
      res.status(500).json({ error: 'Failed to fetch videos and no cached data available' });
    }
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Keys configured:', {
    gnews: !!process.env.GNEWS_API_KEY,
    youtube: !!process.env.YT_API_KEY
  });
}); 