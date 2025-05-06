import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState({
    articles: true,
    videos: true,
    papers: true
  });
  const [error, setError] = useState({
    articles: null,
    videos: null,
    papers: null
  });
  const [summaries, setSummaries] = useState({});

  const fetchWithTimeout = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [newsRes, videosRes, papersRes] = await Promise.all([
        fetchWithTimeout('/api/news'),
        fetchWithTimeout('/api/videos'),
        fetchWithTimeout('/api/papers')
      ]);
      
      const [newsData, videosData, papersData] = await Promise.all([
        newsRes.json(),
        videosRes.json(),
        papersRes.json()
      ]);
      
      setArticles(newsData.articles || []);
      setVideos(videosData.items || []);
      setPapers(papersData.papers || []);
      
      setLoading({
        articles: false,
        videos: false,
        papers: false
      });
    } catch (err) {
      console.error('Data fetching error:', err);
      setError({
        articles: err.message.includes('news') ? err.message : null,
        videos: err.message.includes('videos') ? err.message : null,
        papers: err.message.includes('papers') ? err.message : null
      });
      setLoading({
        articles: false,
        videos: false,
        papers: false
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateSummary = async (content, type, id) => {
    try {
      const response = await fetchWithTimeout('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, type })
      });
      
      if (!response.ok) throw new Error('Summary generation failed');
      
      const data = await response.json();
      setSummaries(prev => ({
        ...prev,
        [`${type}-${id}`]: data.summary
      }));
    } catch (err) {
      console.error('Summary generation error:', err);
      setSummaries(prev => ({
        ...prev,
        [`${type}-${id}`]: 'Summary generation failed. Please try again later.'
      }));
    }
  };

  const renderContent = (items, type, title) => {
    if (loading[type]) return <div className="loading">Loading {title}...</div>;
    if (error[type]) return <div className="error">Error loading {title}: {error[type]}</div>;
    if (!items.length) return <div className="no-content">No {title} available at the moment.</div>;

    return (
      <div className={`${type}-grid`}>
        {items.map((item, index) => {
          const summaryKey = `${type}-${index}`;
          const hasSummary = summaries[summaryKey];
          
          return (
            <div key={index} className={`${type}-card`}>
              <img 
                src={type === 'video' ? item.snippet.thumbnails.high.url : 
                     type === 'article' ? (item.image || 'https://via.placeholder.com/300x200?text=AI+News') :
                     item.thumbnail || 'https://via.placeholder.com/300x200?text=Research+Paper'}
                alt={type === 'video' ? item.snippet.title : item.title}
                onError={(e) => e.target.src = 'https://via.placeholder.com/300x200?text=AI+Content'}
              />
              <div className={`${type}-content`}>
                <h3>{type === 'video' ? item.snippet.title : item.title}</h3>
                <p>{type === 'video' ? item.snippet.description : item.description}</p>
                
                {!hasSummary && (
                  <button 
                    className="summary-button"
                    onClick={() => generateSummary(
                      type === 'video' ? item.snippet.description : item.description,
                      type,
                      index
                    )}
                  >
                    Generate Summary
                  </button>
                )}
                
                {hasSummary && (
                  <div className="summary">
                    <h4>Summary</h4>
                    <p>{summaries[summaryKey]}</p>
                  </div>
                )}
                
                <a 
                  href={type === 'video' ? 
                    `https://www.youtube.com/watch?v=${item.id.videoId}` : 
                    item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {type === 'video' ? 'Watch Video' : 'Read More'}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app">
      <header>
        <h1>AI Trending Now</h1>
      </header>

      <main>
        <section className="articles">
          <h2>Latest AI News</h2>
          {renderContent(articles, 'articles', 'articles')}
        </section>

        <section className="videos">
          <h2>Featured AI Videos</h2>
          {renderContent(videos, 'videos', 'videos')}
        </section>

        <section className="papers">
          <h2>AI Research Papers</h2>
          {renderContent(papers, 'papers', 'research papers')}
        </section>
      </main>
    </div>
  );
}

export default App; 