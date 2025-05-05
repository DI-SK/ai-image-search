// Global error handler and script load log
window.onerror = function(message, source, lineno, colno, error) {
    console.log('Global JS Error:', message, 'at', source, lineno + ':' + colno, error);
};
console.log('ai-image-search.js loaded');

// AI Image Search with Enhanced Recognition
let model;
let additionalModel;
const imageUpload = document.getElementById('ai-upload');
const imagePreview = document.getElementById('ai-image-preview');
const resultsDiv = document.getElementById('ai-results');
const statusDiv = document.getElementById('ai-status');
const loadingDiv = document.getElementById('ai-loading');

// Enhanced categories for recognition
const categories = {
    actors: [
        'person', 'face', 'celebrity', 'actor', 'actress',
        'performer', 'star', 'public figure', 'man', 'woman',
        'suit', 'tuxedo', 'formal wear', 'portrait', 'headshot'
    ],
    characters: [
        'fictional character', 'cartoon', 'anime', 'superhero',
        'villain', 'mascot', 'animated character', 'spider-man',
        'spiderman', 'marvel', 'dc', 'comic book', 'superman',
        'batman', 'superhero costume', 'masked hero', 'cape',
        'comic character', 'action figure', 'cosplay'
    ],
    logos: [
        'logo', 'brand', 'trademark', 'company symbol',
        'corporate identity', 'emblem'
    ],
    lighting: [
        'bright', 'dark', 'natural light', 'artificial light',
        'sunlight', 'shadow', 'backlit', 'spotlight',
        'ambient', 'fluorescent', 'LED', 'warm light',
        'cool light', 'dramatic lighting', 'soft light'
    ],
    general: [
        'object', 'scene', 'landscape', 'indoor', 'outdoor',
        'nature', 'urban', 'technology', 'art'
    ],
    colors: [
        'red', 'blue', 'green', 'yellow', 'purple',
        'orange', 'black', 'white', 'gray', 'brown',
        'pink', 'multicolored', 'vibrant', 'muted'
    ],
    styles: [
        'modern', 'vintage', 'retro', 'minimalist',
        'abstract', 'realistic', 'artistic', 'professional'
    ],
    clothing: [
        'bow tie', 'necktie', 'suit', 'tuxedo', 'formal wear',
        'dress shirt', 'blazer', 'vest', 'formal attire'
    ],
    scene: [
        'city', 'skyline', 'buildings', 'skyscraper', 'urban',
        'architecture', 'downtown', 'metropolis', 'street'
    ]
};

// Initialize models
async function initializeModels() {
    try {
        loadingDiv.style.display = 'block';
        statusDiv.textContent = 'Loading AI models...';

        // Load MobileNet for general object recognition
        model = await mobilenet.load();

        statusDiv.textContent = 'AI models ready!';
        loadingDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading models:', error);
        statusDiv.textContent = 'Error loading AI models. Please try again.';
        loadingDiv.style.display = 'none';
    }
}

// Enhanced image analysis
async function analyzeImage(img) {
    try {
        loadingDiv.style.display = 'block';
        statusDiv.textContent = 'Analyzing image...';

        // Get predictions from MobileNet with increased topk
        const predictions = await model.classify(img, { topk: 10 });
        console.log('MobileNet predictions:', predictions); // Debug log

        // Use only the top 5 MobileNet predictions for search terms
        const searchTerms = predictions
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5)
            .map(p => p.className.split(',')[0].replace(/\s+/g, '-'))
            .filter(Boolean)
            .join(',');
        console.log('Search terms:', searchTerms); // Debug log

        // Show search terms in the UI
        if (searchTerms) {
            statusDiv.textContent = 'Search terms: ' + searchTerms;
            // Fetch similar images only if search terms are valid
            await fetchSimilarImages(searchTerms);
            statusDiv.textContent += '\nAnalysis complete!';
        } else {
            statusDiv.textContent = 'No valid search terms found. Unable to fetch similar images.';
            resultsDiv.innerHTML = '';
        }
        loadingDiv.style.display = 'none';

        // Optionally, display detailed results (MobileNet predictions)
        displayMobileNetResults(predictions);

    } catch (error) {
        console.error('Error analyzing image:', error);
        statusDiv.textContent = 'Error analyzing image. Please try again.';
        loadingDiv.style.display = 'none';
    }
}

// Display MobileNet predictions
function displayMobileNetResults(predictions) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'analysis-details';
    const title = document.createElement('h3');
    title.textContent = 'MobileNet Predictions';
    detailsDiv.appendChild(title);
    const list = document.createElement('ul');
    predictions.forEach(pred => {
        const item = document.createElement('li');
        item.textContent = `${pred.className} (${Math.round(pred.probability * 100)}%)`;
        list.appendChild(item);
    });
    detailsDiv.appendChild(list);
    resultsDiv.innerHTML = '';
    resultsDiv.appendChild(detailsDiv);
}

// Analyze lighting conditions in the image
async function analyzeLighting(img) {
    // Convert image to grayscale and analyze brightness distribution
    const imageData = await tf.browser.fromPixels(img)
        .mean(2)
        .toFloat();

    const brightness = await imageData.mean().data();
    const variance = await imageData.sub(brightness[0]).square().mean().data();

    // Determine lighting characteristics
    const results = [];
    if (brightness[0] > 200) {
        results.push({ label: 'bright lighting', confidence: 0.9 });
    } else if (brightness[0] < 50) {
        results.push({ label: 'dark lighting', confidence: 0.9 });
    }

    if (variance[0] > 1000) {
        results.push({ label: 'high contrast', confidence: 0.8 });
    } else {
        results.push({ label: 'even lighting', confidence: 0.8 });
    }

    return results;
}

// Generate search terms from analysis results
function generateSearchTerms(results) {
    const allTerms = [];
    for (const predictions of Object.values(results)) {
        allTerms.push(...predictions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 2)
            .map(p => p.label.split(' ')[0])); // Use only the first word of each label
    }
    // Limit to top 5 terms overall, remove duplicates
    return [...new Set(allTerms)].slice(0, 5).join(',');
}

// Fetch similar images using the generated search terms (Pixabay)
async function fetchSimilarImages(searchTerms) {
    try {
        resultsDiv.innerHTML = '';
        const apiKey = '50094662-d568135692c916b3b343edefa';
        const query = encodeURIComponent(searchTerms.replace(/,/g, '+'));
        const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&image_type=photo&per_page=1`;
        console.log('Pixabay API URL:', url);
        const response = await fetch(url);
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
            const imageUrl = data.hits[0].webformatURL;
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'ai-result-img';
            resultsDiv.appendChild(img);
        } else {
            statusDiv.textContent += '\nNo similar images found on Pixabay.';
        }
    } catch (error) {
        console.error('Error fetching similar images:', error);
        statusDiv.textContent = 'Error fetching similar images. Please try again.';
    }
}

// Display detailed analysis results
function displayDetailedResults(results) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'analysis-details';
    
    for (const [category, predictions] of Object.entries(results)) {
        if (predictions.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-results';
            
            const title = document.createElement('h3');
            title.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryDiv.appendChild(title);
            
            const list = document.createElement('ul');
            predictions.forEach(pred => {
                const item = document.createElement('li');
                item.textContent = `${pred.label} (${Math.round(pred.confidence * 100)}%)`;
                list.appendChild(item);
            });
            
            categoryDiv.appendChild(list);
            detailsDiv.appendChild(categoryDiv);
        }
    }
    
    // Add details before the results
    resultsDiv.insertBefore(detailsDiv, resultsDiv.firstChild);
}

// Handle image upload
if (imageUpload && imagePreview) {
    console.log('Upload and preview elements found');
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('FileReader loaded:', e.target.result);
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);

        imagePreview.onload = () => {
            console.log('Image loaded in preview');
            analyzeImage(imagePreview);
        };
    });
} else {
    console.log('Upload or preview element not found');
}

// Initialize on page load
window.addEventListener('load', initializeModels); 