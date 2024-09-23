const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./news.db');

// Move news from Latest to Weekly after one day
cron.schedule('0 0 * * *', () => {
  db.run(`UPDATE news SET category = 'Weekly' WHERE releaseTime < DATETIME('now', '-1 day') AND category = 'Latest'`, function(err) {
    if (err) {
      console.error('Error moving news to Weekly:', err);
    } else {
      console.log('Moved news from Latest to Weekly');
    }
  });
});

// Move news from Weekly to Monthly after one week
cron.schedule('0 0 * * *', () => {
  db.run(`UPDATE news SET category = 'Monthly' WHERE releaseTime < DATETIME('now', '-7 day') AND category = 'Weekly'`, function(err) {
    if (err) {
      console.error('Error moving news to Monthly:', err);
    } else {
      console.log('Moved news from Weekly to Monthly');
    }
  });
});

module.exports = db;
