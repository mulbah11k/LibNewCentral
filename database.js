const sqlite3 = require('sqlite3').verbose();
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');

// Initialize Hugging Face Inference API with the best-suited model
const hf = new HfInference('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'); // Replace with your Hugging Face API key

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
        // Ensure text is formatted as an array of strings
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: [text], // Wrap text in an array to ensure it's passed as a list
        });
        return response[0]; // Return the first element (embedding array)
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
// Function to categorize news by content
async function categorizeNewsByContent(newsTitle, newsDescription) {
    const categories = {
        Business: ["economy", "finance", "market", "business"],
        Sports: ["sports", "football", "basketball", "soccer", "athletics"],
        Politics: ["politics", "election", "government", "policy"],
        Education: ["education", "school", "university", "learning", "teaching"]
    };

    const newsText = `${newsTitle} ${newsDescription}`.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => newsText.includes(keyword))) {
            return category; // Return the matched category
        }
    }
    return "Others"; // Return "Others" if no category matches
}

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
//             const seenNewsEmbeddings = new Map(); // To keep track of embeddings for each news

//             for (let row of rows) {
//                 const newsContent = `${row.title} ${row.description}`;
//                 let isDuplicate = false;

//                 // Retrieve or compute the embedding for the current news article
//                 let currentEmbedding = await getEmbeddings(row.id);
//                 if (!currentEmbedding) {
//                     currentEmbedding = await getEmbeddingsFromAPI(newsContent);
//                     if (currentEmbedding) await saveEmbeddings(row.id, currentEmbedding);
//                 }

//                 // Check for similarity against already selected unique news
//                 for (let existingNews of uniqueNews) {
//                     const existingContent = `${existingNews.title} ${existingNews.description}`;
//                     let existingEmbedding = seenNewsEmbeddings.get(existingNews.id);

//                     // If the existing embedding is not retrieved, get it
//                     if (!existingEmbedding) {
//                         existingEmbedding = await getEmbeddings(existingNews.id);
//                         if (!existingEmbedding) {
//                             existingEmbedding = await getEmbeddingsFromAPI(`${existingNews.title} ${existingNews.description}`);
//                             if (existingEmbedding) await saveEmbeddings(existingNews.id, existingEmbedding);
//                         }
//                         seenNewsEmbeddings.set(existingNews.id, existingEmbedding);
//                     }

//                     // Calculate similarity using embeddings if available
//                     if (currentEmbedding && existingEmbedding) {
//                         const similarity = await calculateSimilarity({ id: row.id, title: row.title, description: row.description }, existingNews);
//                         if (similarity >= 0.7) { // Similarity threshold
//                             isDuplicate = true;
//                             break;
//                         }
//                     }
//                 }

//                 if (!isDuplicate) {
//                     row.category = await categorizeNewsByContent(row.title, row.description);

//                     // Summarize similar news articles for the description
//                    // const similarNewsSummaries = await getSimilarNewsSummaries(row.id, uniqueNews);
//          //           row.description = similarNewsSummaries ? similarNewsSummaries : row.description; // Use the summary if available

//                     uniqueNews.push(row);
//                 }
//             }

//             // Summarize each news article in the uniqueNews array
//             const summarizedNews = await getSummaries(uniqueNews);

//             // Ensure we have at least 5 unique news for the first section
//             const firstSection = summarizedNews.slice(0, 5); // First EJS: 5 latest unique news
//             const secondSection = summarizedNews.slice(5); // Second EJS: Remaining unique news

//             // Resolve with sections, ensuring no duplicate items between them
//             resolve({ firstSection, secondSection });
//         });
//     });
// }
// async function getSummaries(uniqueNews) {
//     const summarizedNews = [];
//     for (let news of uniqueNews) {
//         const summary = await getSummariesFromAPI(news.title, news.description);
//         news.description = summary || news.description;
//         summarizedNews.push(news);
//     }
//     return summarizedNews;
// }
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
            const seenNewsEmbeddings = new Map(); // To keep track of embeddings for each news

            for (let row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Retrieve or compute the embedding for the current news article
                let currentEmbedding = await getEmbeddings(row.id);
                if (!currentEmbedding) {
                    currentEmbedding = await getEmbeddingsFromAPI(newsContent);
                    if (currentEmbedding) await saveEmbeddings(row.id, currentEmbedding);
                }

                // Check for similarity against already selected unique news
                for (let existingNews of uniqueNews) {
                    let existingEmbedding = seenNewsEmbeddings.get(existingNews.id);

                    // If the existing embedding is not retrieved, get it
                    if (!existingEmbedding) {
                        existingEmbedding = await getEmbeddings(existingNews.id);
                        if (!existingEmbedding) {
                            existingEmbedding = await getEmbeddingsFromAPI(`${existingNews.title} ${existingNews.description}`);
                            if (existingEmbedding) await saveEmbeddings(existingNews.id, existingEmbedding);
                        }
                        seenNewsEmbeddings.set(existingNews.id, existingEmbedding);
                    }

                    // Calculate similarity using embeddings if available
                    if (currentEmbedding && existingEmbedding) {
                        const similarity = await calculateSimilarity({ id: row.id, title: row.title, description: row.description }, existingNews);
                        if (similarity >= 0.7) { // Similarity threshold
                            isDuplicate = true;
                            break;
                        }
                    }
                }

                if (!isDuplicate) {
                    uniqueNews.push(row);
                }
            }

            // Split the unique news into two sections without overlap
            const firstSection = uniqueNews.slice(0, 5); // First section: 5 latest unique news
            const secondSection = uniqueNews.slice(5); // Second section: Remaining unique news

            // Resolve with sections, ensuring no duplicate items between them
            resolve({ firstSection, secondSection });
        });
    });
}

async function getLatestTitleNewsByDate() {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format

    return new Promise((resolve, reject) => {
        // SQL query to select news items with today's date
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            WHERE date(news.releaseTime) = ?
            ORDER BY news.releaseTime DESC;
        `;

        db.all(query, [today], async (err, rows) => {
            if (err) return reject(err);

            const uniqueNews = []; // Store unique news items
            const seenNewsEmbeddings = new Map(); // Store embeddings for news articles

            // Loop through each news row and check for duplicates
            for (let row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Retrieve or compute the embedding for the current news article
                let currentEmbedding = await getEmbeddings(row.id);
                if (!currentEmbedding) {
                    currentEmbedding = await getEmbeddingsFromAPI(newsContent);
                    if (currentEmbedding) await saveEmbeddings(row.id, currentEmbedding);
                }

                // Check for similarity against already selected unique news
                for (let existingNews of uniqueNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    let existingEmbedding = seenNewsEmbeddings.get(existingNews.id);

                    // If the existing embedding is not retrieved, get it
                    if (!existingEmbedding) {
                        existingEmbedding = await getEmbeddings(existingNews.id);
                        if (!existingEmbedding) {
                            existingEmbedding = await getEmbeddingsFromAPI(`${existingNews.title} ${existingNews.description}`);
                            if (existingEmbedding) await saveEmbeddings(existingNews.id, existingEmbedding);
                        }
                        seenNewsEmbeddings.set(existingNews.id, existingEmbedding);
                    }

                    // Calculate similarity using embeddings if available
                    if (currentEmbedding && existingEmbedding) {
                        const similarity = await calculateSimilarity(
                            { id: row.id, title: row.title, description: row.description }, 
                            existingNews
                        );
                        if (similarity >= 0.8) { // Similarity threshold
                            isDuplicate = true;
                            break;
                        }
                    }
                }

                // If the news item is not a duplicate, add it to the unique news list
                if (!isDuplicate) {
                    row.category = await categorizeNewsByContent(row.title, row.description);
                    uniqueNews.push(row);
                }
            }

            resolve(uniqueNews); // Return the array of unique news items
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
            const seenNewsEmbeddings = new Map(); // To keep track of embeddings for each news

            for (const row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Retrieve or compute the embedding for the current news article
                let currentEmbedding = await getEmbeddings(row.id);
                if (!currentEmbedding) {
                    currentEmbedding = await getEmbeddingsFromAPI(newsContent);
                    if (currentEmbedding) await saveEmbeddings(row.id, currentEmbedding);
                }

                // Check for similarity against already selected categorized news
                for (let existingNews of categorizedNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    let existingEmbedding = seenNewsEmbeddings.get(existingNews.id);

                    // If the existing embedding is not retrieved, get it
                    if (!existingEmbedding) {
                        existingEmbedding = await getEmbeddings(existingNews.id);
                        if (!existingEmbedding) {
                            existingEmbedding = await getEmbeddingsFromAPI(`${existingNews.title} ${existingNews.description}`);
                            if (existingEmbedding) await saveEmbeddings(existingNews.id, existingEmbedding);
                        }
                        seenNewsEmbeddings.set(existingNews.id, existingEmbedding);
                    }

                    // Calculate similarity using embeddings if available
                    if (currentEmbedding && existingEmbedding) {
                        const similarity = await calculateSimilarity({ id: row.id, title: row.title, description: row.description }, existingNews);
                        if (similarity >= 0.8) { // Similarity threshold
                            isDuplicate = true;
                            break;
                        }
                    }
                }

                if (!isDuplicate) {
                    const newsCategory = await categorizeNewsByContent(row.title, row.description);
                    if (category.toLowerCase() === newsCategory.toLowerCase() ||
                        (category.toLowerCase() === 'others' && newsCategory === 'Others')) {
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
            ORDER BY RANDOM()
            LIMIT ?
        `;

        db.all(query, [limit], async (err, rows) => {
            if (err) return reject(err);

            const uniqueNews = [];
            const seenNewsEmbeddings = new Map(); // To keep track of embeddings for each news

            for (let row of rows) {
                const newsContent = `${row.title} ${row.description}`;
                let isDuplicate = false;

                // Retrieve or compute the embedding for the current news article
                let currentEmbedding = await getEmbeddings(row.id);
                if (!currentEmbedding) {
                    currentEmbedding = await getEmbeddingsFromAPI(newsContent);
                    if (currentEmbedding) await saveEmbeddings(row.id, currentEmbedding);
                }

                // Check for similarity against already selected unique news
                for (let existingNews of uniqueNews) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    let existingEmbedding = seenNewsEmbeddings.get(existingNews.id);

                    // If the existing embedding is not retrieved, get it
                    if (!existingEmbedding) {
                        existingEmbedding = await getEmbeddings(existingNews.id);
                        if (!existingEmbedding) {
                            existingEmbedding = await getEmbeddingsFromAPI(`${existingNews.title} ${existingNews.description}`);
                            if (existingEmbedding) await saveEmbeddings(existingNews.id, existingEmbedding);
                        }
                        seenNewsEmbeddings.set(existingNews.id, existingEmbedding);
                    }

                    // Calculate similarity using embeddings if available
                    if (currentEmbedding && existingEmbedding) {
                        const similarity = await calculateSimilarity({ id: row.id, title: row.title, description: row.description }, existingNews);
                        if (similarity >= 0.8) { // Similarity threshold
                            isDuplicate = true;
                            break;
                        }
                    }
                }

                if (!isDuplicate) {
                    row.category = await categorizeNewsByContent(row.title, row.description);
                    uniqueNews.push(row);
                }
            }

            resolve(uniqueNews); // Return only unique news items
        });
    });
}
// Function to fetch unique similar news articles by ID using embeddings
async function getUniqueSimilarNewsById(newsId) {
    return new Promise(async (resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            WHERE news.id != ?
        `;

        db.all(query, [newsId], async (err, rows) => {
            if (err) return reject(err);

            const uniqueSimilarNews = [];
            const mainNews = await getNewsById(newsId); // Fetch the main news article for context

            // Check if mainNews was successfully retrieved
            if (!mainNews) {
                console.error(`Main news not found for ID: ${newsId}`);
                return reject(new Error(`Main news not found for ID: ${newsId}`));
            }

            let mainNewsEmbedding = await getEmbeddings(newsId);

            // Generate embedding for the main news if not found
            if (!mainNewsEmbedding) {
                mainNewsEmbedding = await getEmbeddingsFromAPI(mainNews.description || mainNews.title);

                // Log if mainNews.description or mainNews.title is undefined
                if (!mainNews.description && !mainNews.title) {
                    console.error(`Main news does not have a description or title for ID: ${newsId}`);
                    return reject(new Error(`Main news does not have a description or title for ID: ${newsId}`));
                }

                // Save the new embedding if generated successfully
                if (mainNewsEmbedding) {
                    await saveEmbeddings(newsId, mainNewsEmbedding);
                }
            }

            for (const row of rows) {
                let rowEmbedding = await getEmbeddings(row.id);

                // Generate embedding for the current row if not found
                if (!rowEmbedding) {
                    rowEmbedding = await getEmbeddingsFromAPI(row.description || row.title);
                    if (rowEmbedding) await saveEmbeddings(row.id, rowEmbedding);
                }

                // Calculate similarity using embeddings if both are available
                if (mainNewsEmbedding && rowEmbedding) {
                    const similarity = await calculateSimilarity(
                        { id: newsId, embedding: mainNewsEmbedding }, 
                        { id: row.id, embedding: rowEmbedding }
                    );

                    // Check for uniqueness and similarity threshold
                    if (similarity >= 0.8) { // Similarity threshold
                        uniqueSimilarNews.push(row);
                    }
                }
            }

            resolve(uniqueSimilarNews); // Return only unique similar news items
        });
    });
}


// Function to get one random news article scraped on the same day
async function getOneRandomLatestNewsByDate() {
    return new Promise((resolve, reject) => {
        const query = `
          SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
          FROM news
          JOIN sources ON news.source_id = sources.id
          ORDER BY news.releaseTime DESC
          LIMIT 1
        `;
        db.all(query, [], (err, rows) => {
          if (err) reject(err);
          resolve(rows[0]); // Return the single latest news item
        });
      });
    }

// Function to fetch random similar news article
async function getSimilarNewsById(newsId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            WHERE news.id != ?
            ORDER BY RANDOM()
            LIMIT 1
        `;
        db.get(query, [newsId], (err, row) => {
            if (err) return reject(err);
            resolve(row); // Return a single similar news article
        });
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
            resolve(row); // Return single news item or null
        });
    });
}
async function getAllNews() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
            FROM news
            JOIN sources ON news.source_id = sources.id
            ORDER BY news.releaseTime DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows); // Return all news articles
        });
    });
}
// (async () => {
//     const onenews = await getOneRandomLatestNewsByDate();
//     const { firstSection, secondSection } = await getLatestNewsByDate();
//     console.log('FirstSection:', firstSection);
//     console.log('secondSection:', secondSection);


//     console.log('Latest one News:', onenews);

// })();
module.exports = {
    calculateSimilarity,
    categorizeNewsByContent,
    getLatestNewsByDate,
    cosineSimilarity,
    getLatestTitleNewsByDate,
    getNewsByCategory,
    getRandomUniqueNews,
    getUniqueSimilarNewsById,
    getOneRandomLatestNewsByDate,
    getAllNews,
    getSimilarNewsById,
    saveNewsToDatabase,
    getNewsById,
    
};

