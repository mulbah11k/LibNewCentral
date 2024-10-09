// const sqlite3 = require('sqlite3').verbose();
// const { HfInference } = require('@huggingface/inference');
// const axios = require('axios');

// // Initialize Hugging Face Inference API
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
//         const response = await hf.textSimilarity({
//             model: 'bert-base-uncased',
//             inputs: [text1, text2],
//         });
//         const similarityScore = response[0].score;
//         console.log(`Similarity between "${text1}" and "${text2}" is: ${similarityScore}`);
//         return similarityScore;
//     } catch (error) {
//         console.error('Error calling Hugging Face API:', error);
//         return 0;
//     }
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
// // Function to get unique news items by avoiding displaying multiple similar articles
// // async function getUniqueNewsItems() {
// //     const query = `
// //         SELECT news.id, news.title, news.description, news.imageUrl, sources.name AS source, news.link, news.releaseTime
// //         FROM news
// //         JOIN sources ON news.source_id = sources.id
// //         ORDER BY news.releaseTime DESC
// //     `;

// //     return new Promise((resolve, reject) => {
// //         db.all(query, [], async (err, rows) => {
// //             if (err) return reject(err);

// //             console.log('Fetched news items from the database...');
// //             const displayedNews = new Set(); // Set to track displayed similar news
// //             const uniqueNewsList = [];

// //             for (let i = 0; i < rows.length; i++) {
// //                 const mainNews = rows[i];
// //                 const mainContent = `${mainNews.title} ${mainNews.description}`;

// //                 // Skip this article if it's already displayed as a similar news item
// //                 if (displayedNews.has(mainNews.id)) {
// //                     continue;
// //                 }

// //                 console.log(`Processing news item ID: ${mainNews.id} - ${mainNews.title}`);
// //                 uniqueNewsList.push(mainNews); // Add main news item to unique news list

// //                 // Mark this article and its similar articles as displayed
// //                 for (let j = i + 1; j < rows.length; j++) {
// //                     const compareNews = rows[j];
// //                     const compareContent = `${compareNews.title} ${compareNews.description}`;
                    
// //                     const similarity = await calculateSimilarity(mainContent, compareContent);

// //                     if (similarity >= 0.8) { // If similarity score is >= 0.8, consider them similar
// //                         console.log(`Marking news item ID: ${compareNews.id} as similar to ID: ${mainNews.id}`);
// //                         if (!displayedNews.has(compareNews.id)) {
// //                             displayedNews.add(compareNews.id); // Mark the similar news as displayed
// //                         }
// //                     }
// //                 }

// //                 // Mark main news as displayed
// //                 displayedNews.add(mainNews.id);
// //             }

// //             console.log('Unique news items processed successfully.');
// //             resolve(uniqueNewsList); // Return the list of unique news items
// //         });
// //     });
// // }

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
// const latestNews = getAllNews();
// console.log('Latest News:', latestNews);

// // Example usage
// (async () => {
//     const latestNews = await getLatestNewsByDate();
//     console.log('Latest News:', latestNews);

//     const newsByCategory = await getNewsByCategory('Sports');
//     console.log('Sports News:', newsByCategory);

//     const randomUniqueNews = await getRandomUniqueNews();
//     console.log('Random Unique News:', randomUniqueNews);
// })();

// // Export the functions so they can be used in other parts of your application
// module.exports = {
//     calculateSimilarity,
//     categorizeNewsByContent,
//     getLatestNewsByDate,
//     getNewsByCategory,
//     getRandomUniqueNews,
//     getOneRandomLatestNewsByDate,
//     getAllNews,
//     getSimilarNewsById,
//     saveNewsToDatabase,
//     getNewsById
// };
