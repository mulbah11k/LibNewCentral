/*global module, */
/*global require, */
/*eslint no-undef: "error"*/
const sqlite3 = require('sqlite3').verbose();

// Set up SQLite database
const db = new sqlite3.Database('./news.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT NOT NULL,
      imageUrl TEXT,
      source_id INTEGER,
      category_id INTEGER,  -- Adding this to link news to its category
      releaseTime DATETIME,
      UNIQUE(link),         -- Prevent duplicate news
      FOREIGN KEY (category_id) REFERENCES categories(id) -- Ensure the category exists
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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      article_id INTEGER,
      action_type TEXT,
      action_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      article_id INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Function to save news to the database
async function saveNewsToDatabase(news) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      news.forEach(async (article) => {
        // Insert source
        db.run('INSERT OR IGNORE INTO sources (name, url) VALUES (?, ?)', [article.source, 'URL'], function(err) {
          if (err) return reject(err);
          const sourceId = this.lastID;

          // Insert category
          db.run('INSERT OR IGNORE INTO categories (category_name) VALUES (?)', [article.category], function(err) {
            if (err) return reject(err);
            const categoryId = this.lastID;

            // Insert news with category and source
            db.run('INSERT OR IGNORE INTO news (title, description, link, imageUrl, source_id, category_id, releaseTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [article.title, article.description, article.link, article.imageUrl, sourceId, categoryId, article.releaseTime],
              function(err) {
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
// Function to get the latest news (for today)
async function getLatestNews() {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
  return new Promise((resolve, reject) => {
    const query = `
      SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
      FROM news
      JOIN sources ON news.source_id = sources.id
      WHERE date(news.releaseTime) = ?
      ORDER BY news.releaseTime DESC
    `;
    db.all(query, [today], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}
// Function to get one latest news (most recent)
async function getOneLatestNews() {
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


// Function to get random news (for weekly, monthly, or older)
async function getRandomNews(limit = 10) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
      FROM news
      JOIN sources ON news.source_id = sources.id
      ORDER BY RANDOM()
      LIMIT ?
    `;
    db.all(query, [limit], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}
// Function to get five random latest news items
async function getRandomLatestNews(limit = 5) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
      FROM news
      JOIN sources ON news.source_id = sources.id
      WHERE date(news.releaseTime) = date('now')
      ORDER BY RANDOM()
      LIMIT ?
    `;
    db.all(query, [limit], (err, rows) => {
      if (err) reject(err);
      resolve(rows); // Return the list of random latest news items
    });
  });
}
// Function to get all news
// async function getAllNews() {
//   return new Promise((resolve, reject) => {
//     const query = `
//       SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
//       FROM news
//       JOIN sources ON news.source_id = sources.id
//       ORDER BY news.releaseTime DESC
//     `;
//     db.all(query, [], (err, rows) => {
//       if (err) reject(err);
//       resolve(rows);
//     });
//   });
// }
// Function to get a specific number of news items
async function getNewsWithLimit(limit = 50) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT news.id, news.title, news.imageUrl, sources.name AS source, news.link, news.releaseTime
      FROM news
      JOIN sources ON news.source_id = sources.id
      ORDER BY news.releaseTime DESC
      LIMIT ?
    `;
    db.all(query, [limit], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}
// const getAllNews = async (limit = 8) => {
//   // Query to get news with a dynamic limit along with their categories
//   const query = `
//       SELECT news.*, categories.category_name AS category_name
//       FROM news
//       JOIN categories ON news.category_id = categories.id
//       LIMIT ?
//   `;
  
//   return new Promise((resolve, reject) => {
//     db.all(query, [limit], (err, rows) => {
//       if (err) reject(err);
//       resolve(rows);
//     });
//   });
// };
const getAllNews = async (limit = 8) => {
  // Query to get news with a dynamic limit along with their categories and sources
  const query = `
      SELECT news.*, categories.category_name AS category_name, sources.name AS source_name
      FROM news
      JOIN categories ON news.category_id = categories.id
      JOIN sources ON news.source_id = sources.id
      LIMIT ?
  `;
  
  return new Promise((resolve, reject) => {
    db.all(query, [limit], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

;

module.exports = { saveNewsToDatabase, getLatestNews, getRandomNews, getOneLatestNews, getRandomLatestNews, getNewsWithLimit, getAllNews};
