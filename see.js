// const sqlite3 = require('sqlite3').verbose();
// const { HfInference } = require('@huggingface/inference');
// const axios = require('axios');

// // Initialize Hugging Face Inference API with the best-suited model
// const hf = new HfInference('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'); // Replace with your Hugging Face API key

// // Connect to the SQLite database
// const db = new sqlite3.Database('./news.db');

// // Function to create tables if they don't exist
// db.serialize(() => {
//     console.log('Setting up database...');
//     db.run(`
//         CREATE TABLE IF NOT EXISTS news (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             title TEXT NOT NULL,
//             description TEXT,
//             link TEXT NOT NULL,
//             imageUrl TEXT,
//             source_id INTEGER,
//             category_id INTEGER,
//             releaseTime DATETIME,
//             UNIQUE(link),
//             FOREIGN KEY (category_id) REFERENCES categories(id)
//         )
//     `);

//     db.run(`
//         CREATE TABLE IF NOT EXISTS sources (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             name TEXT NOT NULL,
//             url TEXT NOT NULL
//         )
//     `);

//     db.run(`
//         CREATE TABLE IF NOT EXISTS categories (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             category_name TEXT NOT NULL
//         )
//     `);
//     console.log('Database setup complete.');
// });

// // Function to save news to the database
// async function saveNewsToDatabase(news) {
//     console.log('Saving news to the database...');
//     return new Promise((resolve, reject) => {
//         db.serialize(() => {
//             news.forEach((article) => {
//                 db.run('INSERT OR IGNORE INTO sources (name, url) VALUES (?, ?)', [article.source, article.sourceUrl || ''], function (err) {
//                     if (err) return reject(err);
//                     const sourceId = this.lastID;

//                     db.run('INSERT OR IGNORE INTO categories (category_name) VALUES (?)', [article.category], function (err) {
//                         if (err) return reject(err);
//                         const categoryId = this.lastID;

//                         db.run('INSERT OR IGNORE INTO news (title, description, link, imageUrl, source_id, category_id, releaseTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
//                             [article.title, article.description, article.link, article.imageUrl, sourceId, categoryId, article.releaseTime],
//                             function (err) {
//                                 if (err) return reject(err);
//                                 console.log(`Inserted news with ID: ${this.lastID}`);
//                             }
//                         );
//                     });
//                 });
//             });
//             resolve();
//         });
//     });
// }

// // Function to call Hugging Face API for text similarity calculation
// async function calculateSimilarity(text1, text2) {
//     try {
//         // Using `sentence-transformers/all-MiniLM-L6-v2` for embeddings-based similarity
//         const response = await hf.featureExtraction({
//             model: 'sentence-transformers/all-MiniLM-L6-v2',
//             inputs: [text1, text2],
//         });

//         // Extract embeddings for text1 and text2
//         const [embedding1, embedding2] = response;
        
//         // Calculate cosine similarity between the embeddings
//         const similarityScore = cosineSimilarity(embedding1, embedding2);
//         console.log(`Similarity between "${text1}" and "${text2}" is: ${similarityScore}`);
//         return similarityScore;
//     } catch (error) {
//         console.error('Error calling Hugging Face API:', error);
//         return 0;
//     }
// }

// // Helper function to compute cosine similarity
// function cosineSimilarity(vec1, vec2) {
//     const dotProduct = vec1.reduce((sum, value, index) => sum + value * vec2[index], 0);
//     const magnitude1 = Math.sqrt(vec1.reduce((sum, value) => sum + value * value, 0));
//     const magnitude2 = Math.sqrt(vec2.reduce((sum, value) => sum + value * value, 0));
//     return dotProduct / (magnitude1 * magnitude2);
// }

// // Function to categorize news by content
// async function categorizeNewsByContent(newsTitle, newsDescription) {
//     const categories = {
//         Business: ["economy", "finance", "market", "business"],
//         Sports: ["sports", "football", "basketball", "soccer", "athletics"],
//         Politics: ["politics", "election", "government", "policy"],
//         Education: ["education", "school", "university", "learning", "teaching"]
//     };

//     const newsText = `${newsTitle} ${newsDescription}`.toLowerCase();
//     for (const [category, keywords] of Object.entries(categories)) {
//         if (keywords.some(keyword => newsText.includes(keyword))) {
//             return category; // Return the matched category
//         }
//     }
//     return "Others"; // Return "Others" if no category matches
// }


// // Function to get latest news for today only
// async function getLatestNewsByDate() {
//     const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             WHERE date(news.releaseTime) = ?
//             ORDER BY news.releaseTime DESC
//         `;
//         db.all(query, [today], async (err, rows) => {
//             if (err) return reject(err);

//             const uniqueNews = [];
//             const seenNewsContents = new Set();

//             for (let row of rows) {
//                 const newsContent = `${row.title} ${row.description}`;
//                 let isDuplicate = false;

//                 // Check for similarity against already selected unique news
//                 for (let existingNews of uniqueNews) {
//                     const existingContent = `${existingNews.title} ${existingNews.description}`;
//                     const similarity = await calculateSimilarity(newsContent, existingContent);
//                     if (similarity >= 0.8) { // Similarity threshold
//                         isDuplicate = true;
//                         break;
//                     }
//                 }

//                 if (!isDuplicate) {
//                     row.category = await categorizeNewsByContent(row.title, row.description);
//                     uniqueNews.push(row);
//                 }
//             }

//             resolve(uniqueNews); // Return only unique news items with today's date
//         });
//     });
// }

// // Function to get news by category
// async function getNewsByCategory(category) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             ORDER BY news.releaseTime DESC
//         `;

//         db.all(query, [], async (err, rows) => {
//             if (err) return reject(err);

//             const categorizedNews = [];

//             for (const row of rows) {
//                 const newsContent = `${row.title} ${row.description}`;
//                 let isDuplicate = false;

//                 // Check for similarity against already selected categorized news
//                 for (let existingNews of categorizedNews) {
//                     const existingContent = `${existingNews.title} ${existingNews.description}`;
//                     const similarity = await calculateSimilarity(newsContent, existingContent);
//                     if (similarity >= 0.8) { // Similarity threshold
//                         isDuplicate = true;
//                         break;
//                     }
//                 }

//                 if (!isDuplicate) {
//                     const newsCategory = await categorizeNewsByContent(row.title, row.description);
//                     if (category.toLowerCase() === newsCategory.toLowerCase() || (category.toLowerCase() === 'others' && newsCategory === 'Others')) {
//                         categorizedNews.push(row);
//                     }
//                 }
//             }

//             resolve(categorizedNews); // Return unique news items based on the provided category
//         });
//     });
// }
// // Function to get random unique news from the database
// async function getRandomUniqueNews(limit = 5) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             ORDER BY RANDOM()
//             LIMIT ?
//         `;
//         db.all(query, [limit], async (err, rows) => {
//             if (err) return reject(err);

//             const uniqueNews = [];
//             const seenNewsContents = new Set();

//             for (let row of rows) {
//                 const newsContent = `${row.title} ${row.description}`;
//                 let isDuplicate = false;

//                 // Check for similarity against already selected unique news
//                 for (let existingNews of uniqueNews) {
//                     const existingContent = `${existingNews.title} ${existingNews.description}`;
//                     const similarity = await calculateSimilarity(newsContent, existingContent);
//                     if (similarity >= 0.8) { // Similarity threshold
//                         isDuplicate = true;
//                         break;
//                     }
//                 }

//                 if (!isDuplicate) {
//                     row.category = await categorizeNewsByContent(row.title, row.description);
//                     uniqueNews.push(row);
//                 }
//             }

//             resolve(uniqueNews); // Return only unique news items
//         });
//     });
// }
// // Function to get one random news article scraped on the same day
// async function getOneRandomLatestNewsByDate() {
//     return new Promise((resolve, reject) => {
//         const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format

//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             WHERE date(news.releaseTime) = ?
//             ORDER BY RANDOM() LIMIT 1;
//         `;

//         db.all(query, [today], (err, rows) => {
//             if (err) return reject(err);

//             if (rows.length > 0) {
//                 resolve(rows[0]); // Return one random news article scraped today
//             } else {
//                 resolve(null); // No news articles found for today
//             }
//         });
//     });
// }

// // Function to fetch random similar news article
// async function getSimilarNewsById(newsId) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             WHERE news.id != ?
//             ORDER BY RANDOM()
//             LIMIT 1
//         `;
//         db.get(query, [newsId], (err, row) => {
//             if (err) return reject(err);
//             resolve(row); // Return a single similar news article
//         });
//     });
// }
// // Function to get news by ID
// async function getNewsById(id) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             WHERE news.id = ?
//         `;
//         db.get(query, [id], (err, row) => {
//             if (err) return reject(err);
//             resolve(row); // Return single news item or null
//         });
//     });
// }
// async function getAllNews() {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//             FROM news
//             JOIN sources ON news.source_id = sources.id
//             ORDER BY news.releaseTime DESC
//         `;
//         db.all(query, [], (err, rows) => {
//             if (err) return reject(err);
//             resolve(rows); // Return all news articles
//         });
//     });
// }
// (async () => {
//     const latestNews = await getLatestNewsByDate();
//     console.log('Latest one News:', latestNews);
// })();

// // Remaining functions (getLatestNewsByDate, getNewsByCategory, etc.) will stay the same.
const sqlite3 = require('sqlite3').verbose();
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');

// Initialize Hugging Face Inference API
const hf = new HfInference('your-api-key'); // Replace with your Hugging Face API key

// Connect to the SQLite database
const db = new sqlite3.Database('./news.db');

// Function to create tables if they don't exist
db.serialize(() => {
    console.log('Setting up database...');
    db.run(`
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            link TEXT NOT NULL,
            imageUrl TEXT,
            source_id INTEGER,
            category_id INTEGER,
            releaseTime DATETIME,
            UNIQUE(link),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS similarity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news1_id INTEGER,
            news2_id INTEGER,
            similarity_score REAL,
            FOREIGN KEY (news1_id) REFERENCES news(id),
            FOREIGN KEY (news2_id) REFERENCES news(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_id INTEGER,
            embedding TEXT,
            FOREIGN KEY (news_id) REFERENCES news(id)
        )
    `);

    console.log('Database setup complete.');
});

// Function to save news to the database
async function saveNewsToDatabase(news) {
    console.log('Saving news to the database...');
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            news.forEach((article) => {
                db.run('INSERT OR IGNORE INTO sources (name, url) VALUES (?, ?)', [article.source, article.sourceUrl || ''], function (err) {
                    if (err) return reject(err);
                    const sourceId = this.lastID;

                    db.run('INSERT OR IGNORE INTO categories (category_name) VALUES (?)', [article.category], function (err) {
                        if (err) return reject(err);
                        const categoryId = this.lastID;

                        db.run('INSERT OR IGNORE INTO news (title, description, link, imageUrl, source_id, category_id, releaseTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [article.title, article.description, article.link, article.imageUrl, sourceId, categoryId, article.releaseTime],
                            function (err) {
                                if (err) return reject(err);
                                console.log(`Inserted news with ID: ${this.lastID}`);
                            }
                        );
                    });
                });
            });
            resolve();
        });
    });
}

// Function to check if embeddings exist in the database
async function getEmbeddings(newsId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT embedding FROM embeddings WHERE news_id = ?';
        db.get(query, [newsId], (err, row) => {
            if (err) return reject(err);
            resolve(row ? JSON.parse(row.embedding) : null);
        });
    });
}

// Function to save embeddings to the database
async function saveEmbeddings(newsId, embedding) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO embeddings (news_id, embedding) VALUES (?, ?)', [newsId, JSON.stringify(embedding)], function (err) {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Function to get embeddings from Hugging Face API
async function getEmbeddingsFromAPI(text) {
    try {
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text,
        });
        return response[0];
    } catch (error) {
        console.error('Error calling Hugging Face API:', error);
        return null;
    }
}

// Function to calculate similarity using existing or new embeddings
async function calculateSimilarity(news1, news2) {
    try {
        // Get or calculate embeddings for news1
        let embedding1 = await getEmbeddings(news1.id);
        if (!embedding1) {
            embedding1 = await getEmbeddingsFromAPI(news1.description || news1.title);
            if (embedding1) await saveEmbeddings(news1.id, embedding1);
        }

        // Get or calculate embeddings for news2
        let embedding2 = await getEmbeddings(news2.id);
        if (!embedding2) {
            embedding2 = await getEmbeddingsFromAPI(news2.description || news2.title);
            if (embedding2) await saveEmbeddings(news2.id, embedding2);
        }

        // Calculate and return similarity score if both embeddings are available
        if (embedding1 && embedding2) {
            return cosineSimilarity(embedding1, embedding2);
        }
        return 0;
    } catch (error) {
        console.error('Error calculating similarity:', error);
        return 0;
    }
}

// Helper function to compute cosine similarity
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, value, index) => sum + value * vec2[index], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, value) => sum + value * value, 0));
    return dotProduct / (magnitude1 * magnitude2);
}

// ... (rest of your code remains unchanged) ...
