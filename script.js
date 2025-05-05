// script.js for Trending Now homepage
// Fetch and display trending articles from NewsAPI

const NEWS_API_KEY = '526bd458bee34ceaa8ff582756cc6155';
const articleList = document.getElementById('article-list');

async function fetchTrendingArticles(category = 'all') {
  try {
    let url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=6&apiKey=${NEWS_API_KEY}`;
    if (category !== 'all') {
      url += `&category=${category}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    let articles = (data.articles && data.articles.length > 0) ? data.articles : [];
    articleList.innerHTML = '';
    if (articles.length === 0) {
      articleList.innerHTML = '<p>No trending articles found.</p>';
      return;
    }
    articles.forEach(article => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${article.title}</div>
        <div class="card-meta">${article.source.name} &middot; ${new Date(article.publishedAt).toLocaleDateString()}</div>
        <div class="card-desc">${article.description ? article.description : ''}</div>
        <a class="card-link" href="${article.url}" target="_blank">Read more</a>
      `;
      articleList.appendChild(card);
    });
  } catch (error) {
    articleList.innerHTML = '<p>Error loading articles.</p>';
    console.error('Error fetching articles:', error);
  }
}

// --- Trending AI Videos from YouTube ---
const YT_API_KEY = 'AIzaSyCM2J0ZWN7csPR22sdWyi6l4StinbW0JS0';
const videoList = document.getElementById('video-list');
const videoCategoryFilter = document.getElementById('video-category-filter');

// Example channel IDs (add/remove as needed)
const aiChannels = [
  'UCbfYPyITQ-7l4upoX8nvctg', // Two Minute Papers
  'UCR1-7gYFSmR4F9N9yQeYOuQ', // Yannic Kilcher
  'UC4QZ_LsYcvcq7qOsOhpAX4A', // ColdFusion
  'UCSHZKyawb77ixDdsGog4iWA', // Lex Fridman
  'UCV6KDgJskWaEckne5aPA0aQ', // Bloomberg Technology
  'UCJZ7f6NQzGKZnFXzFW9y9UQ', // CNBC
  'UCWnPjmqvljcafA0z2U1fwKQ', // WSJ
];

async function fetchTrendingVideos(category = 'all') {
  try {
    videoList.innerHTML = '<p>Loading videos...</p>';
    let videos = [];
    for (const channelId of aiChannels) {
      const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${channelId}&part=snippet&type=video&maxResults=3&q=ai`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.items) videos.push(...data.items);
    }
    // Filter by category (simple keyword match)
    if (category !== 'all') {
      videos = videos.filter(v => v.snippet.title.toLowerCase().includes(category) || v.snippet.description.toLowerCase().includes(category));
    }
    if (videos.length === 0) {
      videoList.innerHTML = '<p>No trending videos found.</p>';
      return;
    }
    videoList.innerHTML = '';
    videos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'card';
      const thumbnail = (video.snippet.thumbnails && video.snippet.thumbnails.medium && video.snippet.thumbnails.medium.url)
        ? video.snippet.thumbnails.medium.url
        : 'https://via.placeholder.com/320x180?text=No+Thumbnail';
      card.innerHTML = `
        <img src="${thumbnail}" alt="Video thumbnail" style="width:100%;border-radius:8px 8px 0 0;object-fit:cover;max-height:180px;">
        <div class="card-title">${video.snippet.title}</div>
        <div class="card-meta">${video.snippet.channelTitle} &middot; ${new Date(video.snippet.publishedAt).toLocaleDateString()}</div>
        <div class="card-desc">${video.snippet.description ? video.snippet.description.substring(0, 120) + '...' : ''}</div>
        <a class="card-link" href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank">Watch on YouTube</a>
      `;
      videoList.appendChild(card);
    });
  } catch (error) {
    videoList.innerHTML = '<p>Error loading videos.</p>';
    console.error('Error fetching videos:', error);
  }
}

if (articleList) fetchTrendingArticles();
const articleCategoryFilter = document.getElementById('article-category-filter');
if (articleCategoryFilter) {
  articleCategoryFilter.addEventListener('change', e => {
    fetchTrendingArticles(e.target.value);
  });
}
if (videoList) fetchTrendingVideos();
if (videoCategoryFilter) {
  videoCategoryFilter.addEventListener('change', e => {
    fetchTrendingVideos(e.target.value);
  });
} 