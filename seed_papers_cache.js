const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const CACHE_DIR = path.join(__dirname, 'data');
const PAPERS_CACHE_FILE = path.join(CACHE_DIR, 'papers_cache.json');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'cache_metadata.json');

async function fetchPapers() {
  const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=lastUpdatedDate&sortOrder=descending&max_results=50';
  const response = await fetch(url);
  const xml = await response.text();
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  const entries = result.feed.entry || [];
  const papers = entries.map(entry => ({
    title: entry.title[0],
    abstract: entry.summary[0],
    url: entry.id[0],
    published: entry.published[0],
    authors: entry.author.map(author => author.name[0])
  }));
  return papers;
}

async function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const papers = await fetchPapers();
  fs.writeFileSync(PAPERS_CACHE_FILE, JSON.stringify(papers, null, 2));
  console.log(`Seeded ${papers.length} papers to ${PAPERS_CACHE_FILE}`);

  // Update cache metadata
  let cacheMetadata = {};
  if (fs.existsSync(CACHE_METADATA_FILE)) {
    cacheMetadata = JSON.parse(fs.readFileSync(CACHE_METADATA_FILE, 'utf8'));
  }
  cacheMetadata.papers = {
    lastUpdate: new Date().toISOString(),
    totalPages: Math.ceil(papers.length / 10)
  };
  fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(cacheMetadata, null, 2));
  console.log(`Updated cache metadata in ${CACHE_METADATA_FILE}`);
}

main().catch(err => {
  console.error('Error seeding papers cache:', err);
  process.exit(1);
}); 