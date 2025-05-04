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

// Real AI search using backend
async function searchSimilarImagesReal(file) {
  setLoading(true);
  resultsDiv.innerHTML = '';
  const formData = new FormData();
  formData.append('image', file);

  const resp = await fetch('/api/visual-search', {
    method: 'POST',
    body: formData,
  });
  setLoading(false);

  if (!resp.ok) {
    showResults([]);
    return;
  }
  const data = await resp.json();
  showResults(data.images || []);
}

// Main upload handler
uploadInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  showPreview(file);
  searchSimilarImagesReal(file);
});

// document.querySelector('.ai-upload-label').addEventListener('click', () => {
//   uploadInput.click();
// }); 