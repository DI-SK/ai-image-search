// Enhanced image analysis
async function analyzeImage(img) {
    try {
        loadingDiv.style.display = 'block';
        statusDiv.textContent = 'Analyzing image...';

        // Get predictions from MobileNet with increased topk
        const predictions = await model.classify(img, { topk: 20 });

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
            // Split className on commas and spaces for better matching
            const classNames = pred.className.toLowerCase().split(/,| /).map(s => s.trim());
            const probability = pred.probability;

            // Lower threshold for character and actor detection
            const threshold =
                classNames.some(name => ['person', 'character', 'hero'].includes(name)) ? 0.05 : 0.1;

            if (probability > threshold) {
                // Check each category for matches
                for (const [category, keywords] of Object.entries(categories)) {
                    if (keywords.some(keyword =>
                        classNames.some(name => name.includes(keyword) || keyword.includes(name))
                    )) {
                        results[category].push({
                            label: pred.className,
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

        // Debug: log the search terms
        console.log("Search terms:", searchTerms);

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

// Generate search terms from analysis results
function generateSearchTerms(results) {
    const allTerms = [];
    for (const predictions of Object.values(results)) {
        allTerms.push(...predictions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 2)
            .map(p => p.label.split(',')[0].replace(/\s+/g, '-'))); // Use only the first label, replace spaces with hyphens
    }
    // Limit to top 5 terms overall, remove duplicates
    return [...new Set(allTerms)].slice(0, 5).join(',');
}