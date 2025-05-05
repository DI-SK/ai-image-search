// Theme management
const themeToggle = document.getElementById('theme-toggle');
const themeSelector = document.querySelector('.theme-selector');
const themeButtons = document.querySelectorAll('.theme-btn');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  themeSelector.classList.toggle('visible');
});

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeSelector.classList.remove('visible');
  });
});

// Close theme selector when clicking outside
document.addEventListener('click', (e) => {
  if (!themeSelector.contains(e.target) && e.target !== themeToggle) {
    themeSelector.classList.remove('visible');
  }
});

// Calculator Logic
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const clearBtn = document.getElementById('clear');
const equalsBtn = document.getElementById('equals');
const backspaceBtn = document.getElementById('backspace');

let currentExpression = '';
let lastResult = '';

// Helper: Format number for display
function formatNumber(num) {
  if (typeof num === 'number') {
    return num.toString().length > 10 ? num.toExponential(6) : num.toString();
  }
  return num;
}

// Helper: Safe evaluation using Decimal.js
function safeEval(expr) {
  try {
    // Replace mathematical functions
    expr = expr.replace(/sin\(/g, 'Math.sin(')
              .replace(/cos\(/g, 'Math.cos(')
              .replace(/tan\(/g, 'Math.tan(')
              .replace(/sqrt\(/g, 'Math.sqrt(')
              .replace(/log10\(/g, 'Math.log10(')
              .replace(/log\(/g, 'Math.log(')
              .replace(/\^/g, '**');

    // Evaluate using Function constructor for better safety
    const result = new Function('return ' + expr)();
    return typeof result === 'number' && isFinite(result) ? result : 'Error';
  } catch (error) {
    console.error('Evaluation error:', error);
    return 'Error';
  }
}

// Update display
function updateDisplay() {
  display.value = currentExpression || '0';
}

// Handle number and operator input
buttons.forEach(button => {
  if (!button.id) {  // Skip special buttons (clear, equals, backspace)
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-value');
      if (value) {
        if (lastResult && !isNaN(value[0])) {
          // If starting new number after result, clear previous
          currentExpression = value;
          lastResult = '';
        } else {
          currentExpression += value;
        }
        updateDisplay();
      }
    });
  }
});

// Clear button
clearBtn.addEventListener('click', () => {
  currentExpression = '';
  lastResult = '';
  updateDisplay();
});

// Backspace button
backspaceBtn.addEventListener('click', () => {
  currentExpression = currentExpression.slice(0, -1);
  updateDisplay();
});

// Equals button
equalsBtn.addEventListener('click', () => {
  if (currentExpression) {
    const result = safeEval(currentExpression);
    currentExpression = formatNumber(result);
    lastResult = currentExpression;
    updateDisplay();
  }
});

// Background upload
const bgUpload = document.getElementById('bg-upload');
const bgReset = document.getElementById('bg-reset');

bgUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const url = ev.target.result;
    document.body.classList.add('custom-bg');
    document.body.style.backgroundImage = `url('${url}')`;
    localStorage.setItem('customBg', url);
  };
  reader.readAsDataURL(file);
});

document.querySelector('label[for="bg-upload"]').addEventListener('click', () => {
  bgUpload.click();
});

bgReset.addEventListener('click', () => {
  document.body.classList.remove('custom-bg');
  document.body.style.backgroundImage = '';
  localStorage.removeItem('customBg');
});

// script.js for Trending Now homepage
// Fetch and display trending articles from NewsAPI

const NEWS_API_KEY = '526bd458bee34ceaa8ff582756cc6155';
const articleList = document.getElementById('article-list');

// Fallback demo articles
const demoArticles = [
  {
    title: "AI Revolutionizes Healthcare",
    source: { name: "Demo News" },
    publishedAt: new Date().toISOString(),
    description: "Artificial Intelligence is transforming the healthcare industry with faster diagnostics and personalized treatments.",
    url: "https://www.example.com/ai-healthcare"
  },
  {
    title: "Breakthrough in Machine Learning",
    source: { name: "Tech Today" },
    publishedAt: new Date().toISOString(),
    description: "Researchers announce a new machine learning algorithm that outperforms previous models.",
    url: "https://www.example.com/ml-breakthrough"
  },
  {
    title: "AI in Everyday Life",
    source: { name: "AI World" },
    publishedAt: new Date().toISOString(),
    description: "From smart assistants to self-driving cars, AI is becoming part of our daily routines.",
    url: "https://www.example.com/ai-everyday"
  }
];

// Fallback demo videos
const demoVideos = [
  {
    snippet: {
      title: "What is Artificial Intelligence?",
      channelTitle: "AI Explained",
      publishedAt: new Date().toISOString(),
      description: "A beginner's guide to understanding AI and its impact on society."
    },
    id: { videoId: "dQw4w9WgXcQ" }
  },
  {
    snippet: {
      title: "Top 5 AI Innovations in 2024",
      channelTitle: "Tech Vision",
      publishedAt: new Date().toISOString(),
      description: "A look at the most exciting AI breakthroughs this year."
    },
    id: { videoId: "3tmd-ClpJxA" }
  },
  {
    snippet: {
      title: "How AI is Changing the World",
      channelTitle: "Future Now",
      publishedAt: new Date().toISOString(),
      description: "Experts discuss the future of AI and its role in society."
    },
    id: { videoId: "V-_O7nl0Ii0" }
  }
];

async function fetchTrendingArticles(category = 'all') {
  try {
    let url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=6&apiKey=${NEWS_API_KEY}`;
    if (category !== 'all') {
      url += `&category=${category}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    let articles = (data.articles && data.articles.length > 0) ? data.articles : demoArticles;
    articleList.innerHTML = '';
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
    articleList.innerHTML = '';
    demoArticles.forEach(article => {
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
    console.error('Error fetching articles:', error);
  }
}

// Fetch articles on page load
if (articleList) fetchTrendingArticles();

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
    if (videos.length === 0) videos = demoVideos;
    videoList.innerHTML = '';
    videos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${video.snippet.title}</div>
        <div class="card-meta">${video.snippet.channelTitle} &middot; ${new Date(video.snippet.publishedAt).toLocaleDateString()}</div>
        <div class="card-desc">${video.snippet.description ? video.snippet.description.substring(0, 120) + '...' : ''}</div>
        <a class="card-link" href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank">Watch on YouTube</a>
      `;
      videoList.appendChild(card);
    });
  } catch (error) {
    videoList.innerHTML = '';
    demoVideos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${video.snippet.title}</div>
        <div class="card-meta">${video.snippet.channelTitle} &middot; ${new Date(video.snippet.publishedAt).toLocaleDateString()}</div>
        <div class="card-desc">${video.snippet.description ? video.snippet.description.substring(0, 120) + '...' : ''}</div>
        <a class="card-link" href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank">Watch on YouTube</a>
      `;
      videoList.appendChild(card);
    });
    console.error('Error fetching videos:', error);
  }
}

if (videoList) fetchTrendingVideos();
if (videoCategoryFilter) {
  videoCategoryFilter.addEventListener('change', e => {
    fetchTrendingVideos(e.target.value);
  });
}

// --- Article Category Filter ---
const articleCategoryFilter = document.getElementById('article-category-filter');
if (articleCategoryFilter) {
  articleCategoryFilter.addEventListener('change', e => {
    fetchTrendingArticles(e.target.value);
  });
} 