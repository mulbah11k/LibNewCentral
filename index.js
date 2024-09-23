/*global require, */
/*global __dirname, */
/*eslint no-undef: "error"*/
const express = require("express");
const path = require("path");
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const { saveNewsToDatabase, getLatestNews, getRandomNews, getOneLatestNews, getRandomLatestNews, getNewsWithLimit } = require('./database');
//const db = require('./cronJobs'); // This imports the cron jobs
const app = express();
const port = 4000;

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Serve static files (CSS, JS, images) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the index page
app.get('/', async (req, res) => {
  try {
    // Fetch different types of news data
    const latestNews = await getLatestNews();
    const randomNews = await getRandomNews(10);
    const oneLatestNews = await getOneLatestNews();
    const randomLatestNews = await getRandomLatestNews(5);
    const limitedNews = await getNewsWithLimit(10); // Example limit of 50 news items

    // Render the main template with all the required data
    res.render('index', { 
      latestNews, 
      randomNews, 
      oneLatestNews, 
      randomLatestNews, 
      limitedNews 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving news data");
  }
});

// Route for the about page
app.get('/about', (req, res) => {
    res.render('about');  // Render about.ejs
});

// Route for the blog page
app.get('/blog', (req, res) => {
    res.render('blog');  // Render blog.ejs
});

// Route for the details page
app.get('/details', (req, res) => {
    res.render('details');  // Render details.ejs
});

// Route for the category page
app.get('/categori', (req, res) => {
    res.render('categori');  // Render categori.ejs
});

// Route for the latest news page
app.get('/latest_news', (req, res) => {
    res.render('latest_news');  // Render latest_news.ejs
});

// Route for the single blog page
app.get('/single-blog', (req, res) => {
    res.render('single-blog');  // Render single-blog.ejs
});

// Route for the elements page
app.get('/elements', (req, res) => {
    res.render('elements');  // Render elements.ejs
});

// Route for the main page
app.get('/main', (req, res) => {
    res.render('main');  // Render main.ejs
});

// Route for the contact page
app.get('/contact', (req, res) => {
    res.render('contact');  // Render contact.ejs
});



// Function to scrape news from The New Dawn Liberia
// async function scrapeTheNewDawnLiberia() {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto('https://thenewdawnliberia.com/', { waitUntil: 'load', timeout: 0 });
//   await page.waitForSelector('.mag-box-container .posts-items.posts-list-container');
//   const news = await page.evaluate(() => {
//     const articles = [];
//     const newsItems = document.querySelectorAll('.posts-items .post-item');
//     newsItems.forEach(item => {
//       const title = item.querySelector('h2.post-title a')?.innerText || 'No title';
//       const link = item.querySelector('h2.post-title a')?.href || 'No link';
//       const description = item.querySelector('.post-details p.post-excerpt')?.innerText || 'No description';
//       const releaseTime = item.querySelector('.post-meta .date.meta-item.tie-icon')?.innerText || 'No date';
//       const imageUrl = item.querySelector('a.post-thumb img')?.src || 'No image available';
//       articles.push({ title, link, description, releaseTime, imageUrl, source: 'The New Dawn Liberia' });
//     });
//     return articles;
//   });
//   await browser.close();
//   return news;
// }

// Function to scrape news from Liberian Observer
async function scrapeLiberianObserver() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.liberianobserver.com/', { waitUntil: 'load', timeout: 0 });
  await page.waitForSelector('.row.equal-height.swapRow');
  
  const news = await page.evaluate(() => {
    const articles = [];

    // Function to scrape news from specific div IDs
    function scrapeNewsFromDiv(divId) {
      const div = document.querySelector(`#${divId}`);
      const newsItems = div.querySelectorAll('article');
      
      newsItems.forEach(item => {
        const title = item.querySelector('h2 a')?.innerText || item.querySelector('h3 a')?.innerText;
        const link = item.querySelector('h2 a')?.href || item.querySelector('h3 a')?.href;
        const description = item.querySelector('p')?.innerText || '';
        // const releaseTime = item.querySelector('time')?.innerText || item.querySelector('.jeg_meta_date')?.innerText || 'No date available';
        const releaseTimeElement = item.querySelector('time');
        const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : null;
  

        // Check for the actual image in the secondary <img> tag or the base64 placeholder image
        const imageContainer = item.querySelector('.image');
        const imageUrl = imageContainer?.querySelector('.tnt-blurred-image img')?.src || // Actual image URL
                         imageContainer?.querySelector('img')?.src || // Base64 or other placeholder image
                         'No image available';

        if (title && link) {
          articles.push({ title, link, description, releaseTime, imageUrl, source: 'Liberian Observer' });
        }
      });
    }

    // Scrape from the specified divs
    scrapeNewsFromDiv('tncms-region-front-swap-one-a');
    scrapeNewsFromDiv('tncms-region-front-swap-one-b');

    return articles;
  });

  await browser.close();
  return news;
}

// Function to scrape news from FrontPage Africa
// async function scrapeFrontPageAfrica() {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto('https://frontpageafricaonline.com/', { waitUntil: 'networkidle2', timeout: 0 });
//   await page.waitForSelector('.slick-slider .slick-track', { timeout: 60000 });
//   const news = await page.evaluate(() => {
//     const articles = [];
//     const newsItems = document.querySelectorAll('.slick-slider .slick-track article');
//     newsItems.forEach(item => {
//       const titleElement = item.querySelector('h2.is-title.post-title a');
//       const descriptionElement = item.querySelector('p');
//       const linkElement = item.querySelector('a.image-link');
//       const releaseTimeElement = item.querySelector('time');
//       const imageSpanElement = item.querySelector('a.image-link span[data-bgsrc]');
//       const title = titleElement ? titleElement.innerText : '';
//       const link = linkElement ? linkElement.href : '';
//       const description = descriptionElement ? descriptionElement.innerText : '';
//       const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : '';
//       let image = '';
//       if (imageSpanElement) {
//         const backgroundImage = imageSpanElement.style.backgroundImage;
//         image = backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
//       }
//       articles.push({ title, link, description, releaseTime, image, source: 'FrontPage Africa' });
//     });
//     return articles;
//   });
//   await browser.close();
//   return news;
// }
// const puppeteer = require('puppeteer');

// async function scrapeFrontPageAfrica() {
//   const browser = await puppeteer.launch({ headless: true }); // Set headless to false if you want to see the browser
//   const page = await browser.newPage();
//   await page.goto('https://frontpageafricaonline.com/', { waitUntil: 'networkidle2', timeout: 0 });

//   // Wait for the news items to load
//   await page.waitForSelector('.slick-list .slick-track', { timeout: 60000 });

//   // Evaluate the page content to extract the news articles
//   const news = await page.evaluate(() => {
//     const articles = [];

//     // Select all news articles within the slick-slider container
//     const newsItems = document.querySelectorAll('.slick-list .slick-track article');

//     newsItems.forEach(item => {
//       // Extract the title
//       const titleElement = item.querySelector('h2.is-title.post-title a');
//       const title = titleElement ? titleElement.innerText.trim() : 'No title';

//       // Extract the link to the article
//       const linkElement = item.querySelector('a.image-link');
//       const link = linkElement ? linkElement.href : 'No link';

//       // Extract the description
//       const descriptionElement = item.querySelector('.excerpt p');
//       const description = descriptionElement ? descriptionElement.innerText.trim() : 'No description';

//       // Extract the release time
//       const releaseTimeElement = item.querySelector('time');
//       const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : 'No date';

//       // Extract the image URL from the data-bgsrc attribute
//       const imageSpanElement = item.querySelector('a.image-link span[data-bgsrc]');
//       const imageUrl = imageSpanElement ? imageSpanElement.getAttribute('data-bgsrc') : 'No image available';

//       // Push the extracted article data to the articles array
//       articles.push({
//         title,
//         link,
//         description,
//         releaseTime,
//         imageUrl,
//         source: 'FrontPage Africa'
//       });
//     });

//     return articles;
//   });

//   await browser.close();
//   return news;
// }

// // Example usage
// scrapeFrontPageAfrica().then(news => console.log(news)).catch(err => console.error(err));
async function scrapeFrontPageAfrica() {
  const browser = await puppeteer.launch({ headless: true }); // Set headless to false if you want to see the browser
  const page = await browser.newPage();
  await page.goto('https://frontpageafricaonline.com/', { waitUntil: 'networkidle2', timeout: 0 });

  // Wait for the news items to load
  await page.waitForSelector('.slick-list .slick-track', { timeout: 60000 });

  // Evaluate the page content to extract the news articles
  const news = await page.evaluate(() => {
    const articles = [];

    // Select all news articles within the slick-slider container
    const newsItems = document.querySelectorAll('.slick-list .slick-track article');

    newsItems.forEach(item => {
      // Extract the title
      const titleElement = item.querySelector('h2.is-title.post-title a');
      const title = titleElement ? titleElement.innerText.trim() : null;

      // Extract the link to the article
      const linkElement = item.querySelector('a.image-link');
      const link = linkElement ? linkElement.href : null;

      // Extract the description
      const descriptionElement = item.querySelector('.excerpt p');
      const description = descriptionElement ? descriptionElement.innerText.trim() : null;

      // Extract the release time
      const releaseTimeElement = item.querySelector('time');
      const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : null;

      // Extract the image URL from the data-bgsrc attribute
      const imageSpanElement = item.querySelector('a.image-link span[data-bgsrc]');
      const imageUrl = imageSpanElement ? imageSpanElement.getAttribute('data-bgsrc') : null;

      // Only push the article if it has title, image URL, and description
      if (title && imageUrl && description) {
        articles.push({
          title,
          link,
          description,
          releaseTime,
          imageUrl,
          source: 'FrontPage Africa'
        });
      }
    });

    return articles;
  });

  await browser.close();
  return news;
}

// Function to scrape all sources and save to the database


async function scrapeAndSaveNews() {
  try {
    //const newDawnNews = await scrapeTheNewDawnLiberia();
    const observerNews = await scrapeLiberianObserver();
    const frontPageNews = await scrapeFrontPageAfrica();

    const allNews = [...observerNews, ...frontPageNews]; //...newDawnNews,
    await saveNewsToDatabase(allNews);
  } catch (error) {
    console.error('Error scraping and saving news:', error);
  }
}

// Schedule scraping daily at midnight
cron.schedule('0 0 * * *', scrapeAndSaveNews);

// Start the initial scraping
scrapeAndSaveNews();
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});