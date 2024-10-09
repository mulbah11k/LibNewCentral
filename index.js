/*global require, */
/*global __dirname, */
/*eslint no-undef: "error"*/
const express = require("express");

const path = require("path");
const puppeteer = require('puppeteer');
const axios = require('axios');

const cron = require('node-cron');
const { ccalculateSimilarity,
  categorizeNewsByContent,
  getLatestNewsByDate,
  getLatestTitleNewsByDate,
  cosineSimilarity,
  getNewsByCategory,
  getRandomUniqueNews,
  getOneRandomLatestNewsByDate,
  getAllNews,
  getSimilarNewsById,
  saveNewsToDatabase,
  getNewsById,
  getUniqueSimilarNewsById
   } = require('./database');
//const db = require('./cronJobs'); // This imports the cron jobs
const app = express();
const port = 3000;
// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Serve static files (CSS, JS, images) from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public', {
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));


// Route for the index page
app.get('/', async (req, res) => {
  try {
    // Fetch different types of news data
    const { firstSection, secondSection } = await getLatestNewsByDate();
    const randomNews = await getRandomUniqueNews(10);
    const othersNews = await getNewsByCategory('Others');
    const politicsNews = await getNewsByCategory('Politics');
    const educationNews = await getNewsByCategory('Education');
    const businessNews = await getNewsByCategory('Business');
    const sportsNews = await getNewsByCategory('Sports');
    const oneSimilarNews = await getOneRandomLatestNewsByDate(); // Get one similar news to the news with ID 1
    const allNews = await getAllNews(); // Get all news
    const latesttitle = await getLatestTitleNewsByDate(); 

    // Render the main template with all the required data
    res.render('index', { 
      firstSection, 
      secondSection,
      latesttitle,
      randomNews, 
      othersNews,
      educationNews,
      politicsNews,
      businessNews,
      sportsNews ,
      oneSimilarNews, 
      allNews 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving news data");
  }
});
// Improved proxy route for image fetching with additional logging and headers
app.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url; // Get the image URL from query parameters

  // Check if the URL is present and valid
  if (!imageUrl) {
      console.error('Error: No image URL provided');
      return res.status(400).send('Image URL is required');
  }

  try {
      // Verify that the URL protocol is either HTTP or HTTPS
      const validProtocols = ['http:', 'https:'];
      const urlProtocol = new URL(imageUrl).protocol;

      if (!validProtocols.includes(urlProtocol)) {
          console.error('Protocol mismatch error:', imageUrl);
          return res.status(400).send('Invalid protocol. Only HTTP and HTTPS are allowed.');
      }

      // Log the image URL for debugging
      console.log('Fetching image from:', imageUrl);

      // Set up Axios configuration to prevent protocol issues
      const axiosConfig = {
          responseType: 'arraybuffer', // To handle binary data like images
          proxy: false, // Disable the default proxy behavior in Axios
          maxRedirects: 5, // Limit the number of redirects to prevent infinite loops
      };

      // Fetch the image using Axios
      const response = await axios.get(imageUrl, axiosConfig);

      // Check if a valid response was received
      if (response.status === 200) {
          // Set the appropriate content type and send the image data
          res.setHeader('Content-Type', response.headers['content-type']);
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Optional: Cache the image
          res.send(response.data);
      } else {
          console.error(`Failed to fetch image. Status: ${response.status}, URL: ${imageUrl}`);
          res.status(response.status).send('Failed to load image');
      }
  } catch (err) {
      // Handle different types of errors
      if (err.response) {
          // Axios error with response (status code not in the range of 2xx)
          if (err.response.status === 404) {
              console.error(`Image not found: ${imageUrl}`);
              return res.status(404).send('Image not found');
          }
          console.error(`Failed to fetch image. Status: ${err.response.status}, URL: ${imageUrl}`);
          return res.status(err.response.status).send('Failed to load image');
      } else if (err.request) {
          // Axios error without response (request made but no response received)
          console.error('No response received for the request:', err.request);
          return res.status(500).send('Failed to load image');
      } else {
          // Other errors
          console.error('Error fetching image:', err.message);
          return res.status(500).send('Failed to load image');
      }
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
app.get('/details/:id', async (req, res) => {
  const newsId = req.params.id;
  
  // Replace this with your actual function to retrieve the news item by ID
  const newsItem = await getNewsById(newsId);  

  if (newsItem) {
      res.render('details', { newsItem });  // Pass the news item to the EJS template
  } else {
      res.status(404).send('News not found');  // Handle case if no news item is found
  }
});
// Route to get unique similar news by ID
app.get('/similar/:id', async (req, res) => {
  try {
      const newsId = req.params.id; // Get the news ID from the request parameters
      const similarNews = await getUniqueSimilarNewsById(newsId); // Get similar news articles

      res.render('similar', { similarNews }); // Render the EJS template with similar news
  } catch (error) {
      console.error('Error fetching similar news:', error);
      res.status(500).send('An error occurred while fetching similar news.');
  }
});
app.get('/categori', async (req, res) => {
  try {
    // Fetch different types of news data
    const oneLatestNews = getOneRandomSimilarNews();
    const newsByCategory = getNewsByCategory()
    const latestNews = getLatestNewsByDate()

    // Render the main template with all the required data
    res.render('categori', { 
      latestNews, 
      randomNews, 
      oneLatestNews, 
      randomLatestNews, 
      limitedNews,
      allNews 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving news data");
  }
});

app.get('/scrape-news', async (req, res) => {
  try {
    await scrapeAndSaveNews();
    res.send('News scraping successful');
  } catch (error) {
    console.error('Error occurred while scraping news:', error);
    res.status(500).send('Error occurred while scraping news');
  }
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
// Hotpepper Liberia news
async function scrapeHotPepperLiberia() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://hotpepperliberia.com/', { waitUntil: 'networkidle2', timeout: 0 });

  // Wait for the news articles to load
  await page.waitForSelector('.bs-shortcode.bs-slider .slides .slide');

  // Scrape news articles
  const news = await page.evaluate(() => {
    const articles = [];

    // Get all news articles
    const newsItems = document.querySelectorAll('.bs-shortcode.bs-slider .slides .slide');

    newsItems.forEach(item => {
      const title = item.querySelector('.title a')?.innerText;
      const link = item.querySelector('.title a')?.href;
      const releaseTimeElement = item.querySelector('time');
      const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : null;

      // Extract the image URL
      const imageUrl = item.querySelector('.img-cont').style.backgroundImage
        .replace('url(', '')
        .replace(')', '')
        .replace(/"/g, '');

      const category = item.querySelector('.term-badges')?.innerText || 'Uncategorized';

      if (title && link) {
        articles.push({
          title,
          link,
          releaseTime,
          imageUrl,
          category,
          source: 'Hot Pepper Liberia'
        });
      }
    });

    return articles;
  });

  // Iterate over each article and scrape the description from the news details page
  for (const article of news) {
    const detailPage = await browser.newPage();
    await detailPage.goto(article.link, { waitUntil: 'networkidle2', timeout: 0 });

    // Scrape the description from the first <p> inside the news content
    const description = await detailPage.evaluate(() => {
      const firstParagraph = document.querySelector('.entry-content p');
      return firstParagraph ? firstParagraph.innerText.trim() : 'No description available';
    });

    // Add the description to the article object
    article.description = description;

    // Close the details page
    await detailPage.close();
  }

  await browser.close();
  return news;
}
// indd

async function scrapeIndependentProbe() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Block unnecessary resources like images and stylesheets
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
      req.abort();  // Block these resources
    } else {
      req.continue();  // Allow other resources
    }
  });

  // Navigate to the site and wait for the content to load
  await page.goto('https://independentprobe.com/', {
    waitUntil: 'networkidle2',  // Wait until no more than 2 network connections are active
    timeout: 60000              // Set timeout to 60 seconds
  });

  // Wait for the main content to appear
  await page.waitForSelector('.jet-listing-grid__item');

  // Get the current time when the news is scraped
  const date = new Date().toISOString(); // ISO format: YYYY-MM-DDTHH:mm:ss.sss

  // Scrape news items from the page
  const news = await page.evaluate((date) => {
    const articles = [];
    const newsItems = document.querySelectorAll('.jet-listing-grid__item');
    
    newsItems.forEach(item => {
      const titleElement = item.querySelector('.elementor-widget-heading a');
      // const dateElement = item.querySelector('.elementor-icon-list-text');
      const imgElement = item.querySelector('img');

      // Extract the required fields
      const title = titleElement ? titleElement.innerText : null;
      const link = titleElement ? titleElement.href : null;
      // const date = dateElement ? dateElement.innerText : null;
      const imageUrl = imgElement ? imgElement.src : 'No image available';

      if (title && link) {
        articles.push({ 
          title, 
          link, 
          imageUrl, 
          source: 'Independent Probe', 
          date // Add scrape time to each article
        });
      }
    });

    return articles;
  }, date);  // Pass scrapeTime to page.evaluate

  // Visit each news detail page to scrape additional information
  for (let article of news) {
    const detailPage = await browser.newPage();
    await detailPage.goto(article.link, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scrape description and category from the detail page
    const additionalInfo = await detailPage.evaluate(() => {
      const descriptionElement = document.querySelector('.elementor-widget-container p');
      const categoryElement = document.querySelector('.elementor-heading-title');
      return {
        description: descriptionElement ? descriptionElement.innerText.trim() : 'No description available',
        category: categoryElement ? categoryElement.innerText.trim() : 'Uncategorized'
      };
    });

    // Add description and category to the article
    article.description = additionalInfo.description;
    article.category = additionalInfo.category;
    
    await detailPage.close();
  }

  await browser.close();
  return news;
}


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
        const releaseTimeElement = item.querySelector('time');
        const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : null;

        // Check for the actual image in the secondary <img> tag or the base64 placeholder image
        const imageContainer = item.querySelector('.image');
        const imageUrl = imageContainer?.querySelector('.tnt-blurred-image img')?.src ||
                         imageContainer?.querySelector('img')?.src || 
                         'No image available';

        // Scrape the category from the <a> tag inside the .card-label-section div
        const categoryElement = item.querySelector('.card-label-section a.tnt-section-tag');
        const category = categoryElement ? categoryElement.innerText.trim() : 'Uncategorized';

        if (title && link) {
          articles.push({ title, link, description, releaseTime, imageUrl, source: 'Liberian Observer', category });
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


// // Example usage
// scrapeFrontPageAfrica().then(news => console.log(news)).catch(err => console.error(err));
async function scrapeFrontPageAfrica() {
  const browser = await puppeteer.launch({ headless: true }); // Set headless to false if you want to see the browser
  const page = await browser.newPage();
  
  // Navigate to the FrontPage Africa website
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

      // Extract the category from the span element
      const categoryElement = item.querySelector('.meta-item.post-cat a');
      const category = categoryElement ? categoryElement.innerText.trim() : 'Uncategorized'; // Default to 'Uncategorized' if not found

      // Only push the article if it has title, image URL, and description
      if (title && imageUrl && description) {
        articles.push({
          title,
          link,
          description,
          releaseTime,
          imageUrl,
          category, // Add the category to the article data
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
    const hotPepperNews = await scrapeHotPepperLiberia() ;
    const independentNews = await scrapeIndependentProbe();


    const allNews = [...observerNews, ...frontPageNews, ...hotPepperNews, ...independentNews]; //...newDawnNews,
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