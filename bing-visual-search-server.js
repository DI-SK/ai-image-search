const express = require('express');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

const BING_API_KEY = 'YOUR_BING_API_KEY'; // <-- Replace with your Bing Visual Search API key
const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/visualsearch';

app.use(express.static('.'));

app.post('/api/visual-search', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Prepare multipart/form-data for Bing
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path));

    const response = await fetch(BING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': BING_API_KEY,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bing API error:', response.status, response.statusText);
      console.error('Headers:', response.headers.raw());
      console.error('Body:', errorText);
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Bing API error', status: response.status, statusText: response.statusText, body: errorText });
    }

    const data = await response.json();
    fs.unlinkSync(req.file.path); // Clean up

    // Extract similar images
    const tags = data.tags || [];
    let images = [];
    tags.forEach(tag => {
      if (tag.actions) {
        tag.actions.forEach(action => {
          if (action.actionType === 'VisualSearch' && action.data && action.data.value) {
            images = images.concat(action.data.value.map(img => img.thumbnailUrl));
          }
        });
      }
    });

    res.json({ images });
  } catch (err) {
    console.error('Server error:', err.stack || err);
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'API error', details: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 