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
        
        // Additional models could be loaded here for specialized recognition
        
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
        const predictions = await model.classify(img, { topk: 20 }); // Increased from default
        
        // Enhanced analysis results
        const results = {
            actors: [],
            characters: [],
            logos: [],
            lighting: [],
            general: [],
            colors: [],
            styles: [],
            clothing: [],
            scene: []
        };

        // Process predictions with lower threshold for better detection
        predictions.forEach(pred => {
            const className = pred.className.toLowerCase();
            const probability = pred.probability;

            // Lower threshold for character and actor detection
            const threshold = 
                className.includes('person') || 
                className.includes('character') || 
                className.includes('hero') ? 0.05 : 0.1;

            if (probability > threshold) {
                // Check each category for matches
                for (const [category, keywords] of Object.entries(categories)) {
                    if (keywords.some(keyword => className.includes(keyword))) {
                        results[category].push({
                            label: className,
                            confidence: probability
                        });
                    }
                }
            }
        });

        // Analyze lighting conditions
        const lightingAnalysis = await analyzeLighting(img);
        results.lighting = results.lighting.concat(lightingAnalysis);

        // Generate search terms based on results
        const searchTerms = generateSearchTerms(results);
        
        // Fetch similar images
        await fetchSimilarImages(searchTerms);

        statusDiv.textContent = 'Analysis complete!';
        loadingDiv.style.display = 'none';

        // Display detailed results
        displayDetailedResults(results);

    } catch (error) {
        console.error('Error analyzing image:', error);
        statusDiv.textContent = 'Error analyzing image. Please try again.';
        loadingDiv.style.display = 'none';
    }
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
            .map(p => p.label));
    }
    // Limit to top 5 terms overall
    return allTerms.slice(0, 5).join(' ');
}

// Fetch similar images using the generated search terms
async function fetchSimilarImages(searchTerms) {
    try {
        // Clear previous results
        resultsDiv.innerHTML = '';
        
        // Use Unsplash API for demo purposes
        // In production, replace with your preferred image API
        const response = await fetch(`https://source.unsplash.com/featured/?${encodeURIComponent(searchTerms)}`);
        
        if (response.ok) {
            const imageUrl = response.url;
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'ai-result-img';
            resultsDiv.appendChild(img);
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
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        console.log('File selected:', file); // Debug log
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('FileReader loaded:', e.target.result); // Debug log
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);

        imagePreview.onload = () => {
            console.log('Image loaded in preview'); // Debug log
            analyzeImage(imagePreview);
        };
    });
}

// Initialize on page load
window.addEventListener('load', initializeModels); 