const sqlite3 = require('sqlite3').verbose();
//const { tf, use } = require('@tensorflow/tfjs-node'); // Make sure to use the correct TensorFlow package

// Database connection
const db = new sqlite3.Database('./news.db');

// Load the Universal Sentence Encoder model
let model;

// Function to set up TensorFlow backend
async function setupTensorFlowBackend() {
    await tf.setBackend('cpu'); // or 'wasm', based on your environment
    await tf.ready(); // Ensure TensorFlow is ready before using it
    console.log("TensorFlow backend set successfully!");
}

// Initiali\ze the backend and then load the model
setupTensorFlowBackend().then(() => {
    use.load().then(loadedModel => {
        model = loadedModel;
        console.log("Model loaded successfully!");
    }).catch(console.error);
}).catch(console.error);

// Function to calculate the similarity between two text strings using the Universal Sentence Encoder
async function calculateSimilarity(text1, text2) {
    if (!model) {
        throw new Error("Model not loaded");
    }
    const embeddings = await model.embed([text1, text2]);
    const similarityScore = tf.losses.cosineDistance(embeddings.slice([0, 0], [1]), embeddings.slice([1, 0], [1]), 0).dataSync()[0];
    return 1 - similarityScore; // Return similarity score (higher is more similar)
}

// Function to analyze the meaning and categorize news based on the content
async function categorizeNewsByContent(newsTitle, newsDescription) {
    const categories = {
        Business: ["economy", "finance", "market", "business"],
        Sports: ["sports", "football", "basketball", "soccer", "athletics"],
        Politics: ["politics", "election", "government", "policy"],
        Education: ["education", "school", "university", "learning", "teaching"]
    };

    const newsText = `${newsTitle} ${newsDescription}`.toLowerCase();
    const newsEmbedding = await model.embed([newsText]);

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => newsText.includes(keyword))) {
            return category; // Return the matched category
        }
    }
    return "Others"; // Return "Others" if no category matches
}

// Function to get latest news for today only
async function getLatestNewsByDate() {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            WHERE date(news.releaseTime) = ?
            ORDER BY news.releaseTime DESC
        `;
        db.all(query, [today], async (err, rows) => {
            if (err) return reject(err);

            const uniqueNews = [];
            const seenNewsContents = new Set();

            for (let row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Check for similarity against already selected unique news
                for (let existingNews of uniqueNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    const similarity = await calculateSimilarity(newsContent, existingContent);
                    if (similarity >= 0.8) { // Similarity threshold
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    row.category = await categorizeNewsByContent(row.title, row.description);
                    uniqueNews.push(row);
                }
            }

            resolve(uniqueNews); // Return only unique news items with today's date
        });
    });
}

// Function to get news by category
async function getNewsByCategory(category) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            ORDER BY news.releaseTime DESC
        `;

        db.all(query, [], async (err, rows) => {
            if (err) return reject(err);

            const categorizedNews = [];

            for (const row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Check for similarity against already selected categorized news
                for (let existingNews of categorizedNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    const similarity = await calculateSimilarity(newsContent, existingContent);
                    if (similarity >= 0.8) { // Similarity threshold
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    const newsCategory = await categorizeNewsByContent(row.title, row.description);
                    if (category.toLowerCase() === newsCategory.toLowerCase() || (category.toLowerCase() === 'others' && newsCategory === 'Others')) {
                        categorizedNews.push(row);
                    }
                }
            }
            resolve(categorizedNews); // Return unique news items based on the provided category
        });
    });
}

// Function to get random unique news from the database
async function getRandomUniqueNews(limit = 5) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            ORDER BY RANDOM() LIMIT ?;
        `;

        db.all(query, [limit], async (err, rows) => {
            if (err) return reject(err);

            const uniqueNews = [];
            const seenNewsContents = new Set();

            for (const row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Check for duplicates against already selected unique news
                for (let existingNews of uniqueNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    const similarity = await calculateSimilarity(newsContent, existingContent);
                    if (similarity >= 0.8) { // Similarity threshold
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    uniqueNews.push(row);
                }

                if (uniqueNews.length >= limit) {
                    break; // Break if we have reached the limit of unique news
                }
            }

            resolve(uniqueNews); // Return array of unique random news articles
        });
    });
}

// Function to get one random similar news based on semantic similarity
async function getOneRandomSimilarNews(mainNewsId) {
    return new Promise(async (resolve, reject) => {
        try {
            const mainNews = await getNewsById(mainNewsId);
            if (!mainNews) return resolve(null);

            const query = `
                SELECT news.id, news.title, news.description, sources.name AS source, news.link, news.releaseTime
                FROM news
                JOIN sources ON news.source_id = sources.id
                WHERE news.id != ?
            `;
            db.all(query, [mainNewsId], async (err, rows) => {
                if (err) return reject(err);

                const similarNews = [];
                for (const article of rows) {
                    const similarityTitle = await calculateSimilarity(mainNews.title, article.title);
                    const similarityDescription = await calculateSimilarity(mainNews.description, article.description);

                    // If similarity is above a threshold, consider it as similar news
                    const similarityThreshold = 0.8; // You can adjust this threshold value
                    if (similarityTitle >= similarityThreshold || similarityDescription >= similarityThreshold) {
                        similarNews.push(article);
                    }
                }

                // Randomly select one of the similar news articles
                const randomSimilarNews = similarNews[Math.floor(Math.random() * similarNews.length)];
                resolve(randomSimilarNews || null); // Return random similar news or null if none found
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Function to get multiple random similar news (returns an array)
async function getRandomSimilarNews(mainNewsId, limit = 5) {
    return new Promise(async (resolve, reject) => {
        try {
            const mainNews = await getNewsById(mainNewsId);
            if (!mainNews) return resolve([]);

            const query = `
                SELECT news.id, news.title, news.description, sources.name AS source, news.link, news.releaseTime
                FROM news
                JOIN sources ON news.source_id = sources.id
                WHERE news.id != ?
            `;
            db.all(query, [mainNewsId], async (err, rows) => {
                if (err) return reject(err);

                const similarNews = [];
                for (const article of rows) {
                    const similarityTitle = await calculateSimilarity(mainNews.title, article.title);
                    const similarityDescription = await calculateSimilarity(mainNews.description, article.description);

                    // If similarity is above a threshold, consider it as similar news
                    const similarityThreshold = 0.8; // You can adjust this threshold value
                    if (similarityTitle >= similarityThreshold || similarityDescription >= similarityThreshold) {
                        similarNews.push(article);
                    }
                }

                // Shuffle and limit the similar news array to the desired count
                const randomSimilarNews = similarNews.sort(() => 0.5 - Math.random()).slice(0, limit);
                resolve(randomSimilarNews); // Return array of random similar news
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Function to get news by ID
async function getNewsById(id) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            WHERE news.id = ?
        `;
        db.get(query, [id], (err, row) => {
            if (err) return reject(err);
            resolve(row); // Return the found news item or null
        });
    });
}

// Function to get all news from the database
async function getAllNews() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows); // Return all news articles
        });
    });
}
// Usage examples:
// getLatestNewsByDate().then((news) => console.log(news));
// getNewsByCategory('Business').then((newsList) => console.log(newsList));
// getOneRandomSimilarNews(1).then((news) => console.log(news));
// getRandomSimilarNews(1).then((newsList) => console.log(newsList));

module.exports = { calculateSimilarity, getAllNews, getNewsById, getRandomSimilarNews, getOneRandomSimilarNews, getRandomUniqueNews, getNewsByCategory, getLatestNewsByDate, categorizeNewsByContent  };
