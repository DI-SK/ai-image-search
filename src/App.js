import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, videosRes] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/videos')
        ]);
        
        const newsData = await newsRes.json();
        const videosData = await videosRes.json();
        
        setArticles(newsData.articles || []);
        setVideos(videosData.items || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="app">
      <header>
        <h1>AI Trending Now</h1>
      </header>

      <main>
        <section className="articles">
          <h2>Latest AI News</h2>
          <div className="article-grid">
            {articles.map((article, index) => (
              <article key={index} className="article-card">
                <img 
                  src={article.image || 'https://via.placeholder.com/300x200?text=AI+News'} 
                  alt={article.title}
                  onError={(e) => e.target.src = 'https://via.placeholder.com/300x200?text=AI+News'}
                />
                <div className="article-content">
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read More
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="videos">
          <h2>Featured AI Videos</h2>
          <div className="video-grid">
            {videos.map((video, index) => (
              <div key={index} className="video-card">
                <img 
                  src={video.snippet.thumbnails.high.url} 
                  alt={video.snippet.title}
                />
                <div className="video-content">
                  <h3>{video.snippet.title}</h3>
                  <p>{video.snippet.description}</p>
                  <a 
                    href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch Video
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App; 