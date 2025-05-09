const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API_KEY = process.env.YT_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE';
const CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers (example)
const CACHE_DIR = path.join(__dirname, 'data');
const VIDEOS_CACHE_FILE = path.join(CACHE_DIR, 'video_cache.json');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'cache_metadata.json');

async function fetchVideos() {
  let allItems = [];
  let nextPageToken = null;
  for (let i = 0; i < 5; i++) {
    let url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&type=video&maxResults=10&order=date`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items) allItems.push(...data.items);
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }
  // Remove duplicates
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex((i) => i.id.videoId === item.id.videoId)
  );
  return uniqueItems;
}

async function main() {
  if (!API_KEY || API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
    console.error('Please set your YT_API_KEY in the script or as an environment variable.');
    process.exit(1);
  }
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const videos = await fetchVideos();
  fs.writeFileSync(VIDEOS_CACHE_FILE, JSON.stringify(videos, null, 2));
  console.log(`Seeded ${videos.length} videos to ${VIDEOS_CACHE_FILE}`);

  // Update cache metadata
  let cacheMetadata = {};
  if (fs.existsSync(CACHE_METADATA_FILE)) {
    cacheMetadata = JSON.parse(fs.readFileSync(CACHE_METADATA_FILE, 'utf8'));
  }
  cacheMetadata.videos = {
    lastUpdate: new Date().toISOString(),
    totalPages: Math.ceil(videos.length / 10)
  };
  fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(cacheMetadata, null, 2));
  console.log(`Updated cache metadata in ${CACHE_METADATA_FILE}`);
}

main().catch(err => {
  console.error('Error seeding videos cache:', err);
  process.exit(1);
}); 