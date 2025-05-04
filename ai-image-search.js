// AI Image Search Logic
const uploadInput = document.getElementById('ai-upload');
const previewImg = document.getElementById('ai-image-preview');
const resultsDiv = document.getElementById('ai-results');
const loadingDiv = document.getElementById('ai-loading');

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

// Pixabay search by keyword
async function searchPixabayImages(file) {
  let keyword = file.name.split(/[^a-zA-Z0-9]/).filter(Boolean)[0] || 'nature';
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
uploadInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  showPreview(file);
  searchPixabayImages(file);
});

// document.querySelector('.ai-upload-label').addEventListener('click', () => {
//   uploadInput.click();
// }); 