const uploadInput = document.getElementById('ai-upload');
const previewImg = document.getElementById('ai-image-preview');
const resultsDiv = document.getElementById('ai-results');
const loadingDiv = document.getElementById('ai-loading');
const statusDiv = document.getElementById('ai-status');

// Helper: Show preview
function showPreview(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    previewImg.src = e.target.result;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Helper: Show loading
function setLoading(isLoading) {
  loadingDiv.style.display = isLoading ? 'block' : 'none';
}

// Helper: Show results
function showResults(images) {
  resultsDiv.innerHTML = '';
  if (!images.length) {
    resultsDiv.innerHTML = '<div style="color:#e74c3c;">No similar images found.</div>';
    return;
  }
  images.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'ai-result-img';
    img.loading = 'lazy';
    resultsDiv.appendChild(img);
  });
}

async function classifyImage(imgElement) {
  statusDiv.textContent = 'Classifying image...';
  const model = await mobilenet.load();
  const predictions = await model.classify(imgElement);
  if (predictions && predictions.length > 0) {
    // Use only the first label before any comma
    const firstLabel = predictions[0].className.split(',')[0].trim();
    statusDiv.textContent = `Predicted: ${firstLabel}`;
    return firstLabel;
  } else {
    statusDiv.textContent = 'Could not classify image.';
    return 'nature';
  }
}

// Pixabay search by keyword
async function searchPixabayImages(keyword) {
  setLoading(true);
  resultsDiv.innerHTML = '';
  const apiKey = '50094662-d568135692c916b3b343edefa'; // <-- Replace with your actual key
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=8`;
  const resp = await fetch(url);
  setLoading(false);
  if (!resp.ok) {
    showResults([]);
    return;
  }
  const data = await resp.json();
  const images = (data.hits || []).map(hit => hit.webformatURL);
  showResults(images);
}

// Main upload handler
uploadInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  showPreview(file);
  // Wait for the image to load in the preview before classifying
  previewImg.onload = async () => {
    const keyword = await classifyImage(previewImg);
    await searchPixabayImages(keyword);
  };
});
