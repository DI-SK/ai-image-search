const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Cache files
const CACHE_DIR = path.join(__dirname, 'data');
const CACHE_FILES = {
    news: path.join(CACHE_DIR, 'news_cache.json'),
    papers: path.join(CACHE_DIR, 'papers_cache.json'),
    videos: path.join(CACHE_DIR, 'video_cache.json')
};

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Cache metadata
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'cache_metadata.json');

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
  if (fs.existsSync(CACHE_FILES.news)) {
    cachedNews = JSON.parse(fs.readFileSync(CACHE_FILES.news, 'utf8'));
  }
} catch (e) { 
  console.warn('Could not load news cache:', e.message);
  cachedNews = []; 
}

try {
  if (fs.existsSync(CACHE_FILES.videos)) {
    cachedVideos = JSON.parse(fs.readFileSync(CACHE_FILES.videos, 'utf8'));
  }
} catch (e) { 
  console.warn('Could not load videos cache:', e.message);
  cachedVideos = []; 
}

try {
  if (fs.existsSync(CACHE_FILES.papers)) {
    cachedPapers = JSON.parse(fs.readFileSync(CACHE_FILES.papers, 'utf8'));
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
  // Temporarily force cache refresh
  return true;
  
  // Original code commented out
  /*
  const lastUpdate = cacheMetadata[type].lastUpdate;
  if (!lastUpdate) return true;
  
  const now = new Date();
  const lastUpdateDate = new Date(lastUpdate);
  const hoursSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60);
  
  // Update if more than 1 hour old
  return hoursSinceUpdate >= 1;
  */
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
      if (!checkRateLimits('gnews')) {
        console.log('Using cached news data due to rate limits');
      } else {
        // Fetch 5 pages of 10 each = 50 articles
        const newsPromises = [];
        for (let i = 1; i <= 5; i++) {
          const url = `https://gnews.io/api/v4/search?q=ai&lang=en&max=10&page=${i}&token=${process.env.GNEWS_API_KEY}`;
          newsPromises.push(fetch(url).then(res => res.json()));
        }
        const results = await Promise.all(newsPromises);
        let articles = [];
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
          fs.writeFileSync(CACHE_FILES.news, JSON.stringify(cachedNews));
          cacheMetadata.news.lastUpdate = new Date().toISOString();
          cacheMetadata.news.totalPages = Math.ceil(articles.length / pageSize);
          saveCacheMetadata();
          console.log(`News cache updated with ${articles.length} articles, total pages: ${cacheMetadata.news.totalPages}`);
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
  const totalPages = Math.ceil(cachedNews.length / pageSize);
  res.json({
    articles: paginatedArticles,
    totalPages: totalPages,
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

  if (needsUpdate('videos')) {
    console.log('Updating videos cache...');
    try {
      if (!checkRateLimits('youtube')) {
        console.log('Using cached videos data due to rate limits');
      } else {
        const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers
        const publishedAfter = new Date();
        publishedAfter.setDate(publishedAfter.getDate() - 30); // last 30 days
        const publishedAfterISO = publishedAfter.toISOString();
        let allItems = [];
        let nextPageToken = null;
        for (let i = 0; i < 5; i++) { // Try to get up to 50 videos
          let url = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YT_API_KEY}&channelId=${channelId}&part=snippet&type=video&maxResults=10&order=date&publishedAfter=${publishedAfterISO}`;
          if (nextPageToken) url += `&pageToken=${nextPageToken}`;
          const response = await fetch(url);
          const contentType = response.headers.get('content-type');
          if (!response.ok || !contentType || !contentType.includes('application/json')) {
            throw new Error('YouTube API error or quota exceeded');
          }
          const data = await response.json();
          if (data.items) allItems.push(...data.items);
          nextPageToken = data.nextPageToken;
          if (!nextPageToken) break;
        }
        // Remove duplicates
        const uniqueItems = allItems.filter((item, index, self) =>
          index === self.findIndex((i) => i.id.videoId === item.id.videoId)
        );
        if (uniqueItems.length > 0) {
          cachedVideos = uniqueItems;
          fs.writeFileSync(CACHE_FILES.videos, JSON.stringify(cachedVideos));
          cacheMetadata.videos.lastUpdate = new Date().toISOString();
          cacheMetadata.videos.totalPages = Math.ceil(uniqueItems.length / pageSize);
          saveCacheMetadata();
          console.log(`Videos cache updated with ${uniqueItems.length} videos, total pages: ${cacheMetadata.videos.totalPages}`);
        }
      }
    } catch (error) {
      console.error('Videos API error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch videos. YouTube API error or quota exceeded.' });
    }
  } else {
    console.log('Using cached videos data');
  }

  // Return paginated results
  const paginatedVideos = cachedVideos.slice(startIndex, endIndex);
  const totalPages = Math.ceil(cachedVideos.length / pageSize);
  res.json({
    items: paginatedVideos,
    totalPages: totalPages,
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
          fs.writeFileSync(CACHE_FILES.papers, JSON.stringify(cachedPapers));
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

// Add summary cache
const SUMMARY_CACHE_FILE = path.join(CACHE_DIR, 'summary_cache.json');
let summaryCache = {};

try {
  if (fs.existsSync(SUMMARY_CACHE_FILE)) {
    summaryCache = JSON.parse(fs.readFileSync(SUMMARY_CACHE_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load summary cache:', e.message);
  summaryCache = {};
}

// Simple text summarization function
function generateSummary(text, type) {
  // Split text into sentences and clean them
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
  
  // Create word frequency map, excluding common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose']);
  
  const wordFreq = {};
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Score sentences based on word frequency and position
  const sentenceScores = cleanSentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0);
    
    // Give higher weight to sentences at the beginning
    const positionWeight = 1 - (index / cleanSentences.length);
    
    // Give higher weight to longer sentences (but not too long)
    const lengthWeight = Math.min(sentenceWords.length / 20, 1);
    
    return { 
      sentence: sentence.trim(),
      score: score * (1 + positionWeight) * (1 + lengthWeight)
    };
  });

  // Sort sentences by score and take top 2-3
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.sentence);

  // Join sentences and add context based on type
  let summary = topSentences.join(' ');
  
  // Add type-specific context
  switch(type) {
    case 'news':
      summary = `Key Points: ${summary}`;
      break;
    case 'paper':
      summary = `Research Highlights: ${summary}`;
      break;
    case 'video':
      summary = `Video Overview: ${summary}`;
      break;
  }

  return summary;
}

// Summary API endpoint
app.post('/api/summarize', async (req, res) => {
  const { content, type } = req.body;
  if (!content || !type) {
    return res.status(400).json({ error: 'Content and type are required' });
  }

  // Create a cache key from the content
  const cacheKey = `${type}-${content.substring(0, 100)}`;
  
  // Check cache first
  if (summaryCache[cacheKey]) {
    console.log('Using cached summary for:', type);
    return res.json({ summary: summaryCache[cacheKey], fromCache: true });
  }

  try {
    console.log('Generating new summary for:', type);
    const summary = generateSummary(content, type);
    
    // Cache the summary
    summaryCache[cacheKey] = summary;
    fs.writeFileSync(SUMMARY_CACHE_FILE, JSON.stringify(summaryCache));
    
    console.log('Successfully generated and cached summary for:', type);
    res.json({ summary, fromCache: false });
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ error: 'Failed to generate summary: ' + error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Basic security check - only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple response to minimize bandwidth
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
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

// Review routes
app.get('/api/reviews', async (req, res) => {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        res.json({ reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { name, rating, text } = req.body;
        
        // Validate input
        if (!name || !rating || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Invalid rating value' });
        }

        const { data, error } = await supabase
            .from('reviews')
            .insert([
                {
                    name,
                    rating,
                    text,
                    date: new Date().toISOString()
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
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