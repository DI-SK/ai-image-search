# AI Trending Now

A real-time AI news aggregator that brings together the latest news, research papers, and videos about artificial intelligence.

## Features

- 📰 Latest AI news from GNews
- 📚 Research papers from arXiv
- 🎥 AI videos from Google Developers
- ⭐ User reviews system
- 📝 Content summarization
- 🔄 Automatic content caching
- 📱 Responsive design

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **APIs**: 
  - GNews API
  - YouTube Data API
  - arXiv API

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-trending-now.git
   cd ai-trending-now
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API keys:
   ```
   GNEWS_API_KEY=your_gnews_api_key
   YT_API_KEY=your_youtube_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is configured for deployment on Render. The `render.yaml` file contains the necessary configuration.

## Environment Variables

- `GNEWS_API_KEY`: Your GNews API key
- `YT_API_KEY`: Your YouTube Data API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NODE_ENV`: Set to 'production' in production

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 