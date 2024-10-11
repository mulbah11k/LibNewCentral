// const puppeteer = require('puppeteer');

// async function scrapeTheNewsNewspaper() {
//   // Launch the browser
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   // Open the website
//   await page.goto('https://thenewsnewspaperonline.com/', { waitUntil: 'load', timeout: 0 });

//   // Wait for the news list wrapper to load
//   await page.waitForSelector('.news-list-wrap');

//   // Extract the news articles
//   const news = await page.evaluate(() => {
//     const articles = [];
    
//     // Select all article elements within the .news-list-wrap div
//     const newsItems = document.querySelectorAll('.news-list-wrap article');

//     newsItems.forEach(item => {
//       // Extract the title and link from the h2 element inside .post-title
//       const titleElement = item.querySelector('.post-title a');
//       const title = titleElement?.innerText || 'No title';
//       const link = titleElement?.href || 'No link';

//       // Extract the image URL from the img tag
//       const imageUrl = item.querySelector('.post-thumb-wrap img')?.src || 'No image';

//       // Extract the category from the category list inside .post-categories
//       const category = item.querySelector('.post-categories li a')?.innerText || 'Uncategorized';
//       // Extract the release time from the time element inside .post-date
//       const releaseTimeElement = item.querySelector('.post-date time');
//       const releaseTime = releaseTimeElement ? releaseTimeElement.getAttribute('datetime') : 'No release time';

//       // Extract the description from the .post-excerpt element
//       const description = item.querySelector('.post-excerpt p')?.innerText || 'No description';

//       // Push the extracted data to the articles array
//       if (title && link) {
//         articles.push({
//           title,
//           link,
//           imageUrl,
//           category,
//           releaseTime,
//           description,
//           source: 'The News Newspaper Online'
//         });
//       }
//     });

//     return articles;
//   });

//   // Close the browser
//   await browser.close();

//   return news;
// }

// // Call the function and log the scraped news
// scrapeTheNewsNewspaper().then(news => {
//   console.log(news);
// }).catch(error => {
//   console.error('Error scraping news:', error);
// });
// const puppeteer = require('puppeteer');

// async function scrapeNewRepublicLiberia() {
//   // Launch the browser
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   // Open the website
//   await page.goto('https://www.newrepublicliberia.com/', { waitUntil: 'load', timeout: 0 });

//   // Wait for the main news element to load
//   await page.waitForSelector('.better-viewport');

//   // Extract the news articles from the main news section
//   const news = await page.evaluate(() => {
//     const articles = [];
    
//     // Select all news item elements within the .better-viewport ul
//     const newsItems = document.querySelectorAll('.better-viewport ul.slides li');

//     newsItems.forEach(item => {
//       // Extract the title and link from the h3 element inside .item-content
//       const titleElement = item.querySelector('.item-content .title a.post-url');
//       const title = titleElement?.innerText || 'No title';
//       const link = titleElement?.href || 'No link';

//       // Extract the image URL from the img style background-image
//       const imageUrl = item.querySelector('.img-cont')?.style.backgroundImage?.slice(5, -2) || 'No image';

//       // Push the extracted data to the articles array
//       if (title && link) {
//         articles.push({
//           title,
//           link,
//           imageUrl,
//           category: 'Unknown', // Default category until we extract it from the details page
//           releaseTime: 'Unknown', // Default release time until we extract it from the details page
//           description: 'No description', // Default description until we extract it from the details page
//           source: 'New Republic Liberia'
//         });
//       }
//     });

//     return articles;
//   });

//   // Iterate through each news item and navigate to the detail page to extract more information
//   for (let article of news) {
//     try {
//       // Open the detail page for the current article
//       await page.goto(article.link, { waitUntil: 'load', timeout: 0 });

//       // Wait for the detail page content to load
//       await page.waitForSelector('.single-container');

//       // Extract additional details (description, release time, category)
//       const details = await page.evaluate(() => {
//         const descriptionElements = document.querySelectorAll('.single-container .entry-content p');
//         const description = Array.from(descriptionElements).slice(0, 3).map(p => p.innerText).join(' ') || 'No description';

//         // Extract release time from the time element
//         const releaseTime = document.querySelector('.post-meta .time time')?.getAttribute('datetime') || 'No release time';

//         // Extract the category from the categories list
//         const categoryElement = document.querySelector('.post-header .post-meta-wrap .category');
//         const category = categoryElement ? categoryElement.innerText.trim() : 'Uncategorized';

//         return { description, releaseTime, category };
//       });

//       // Assign the extracted details to the article object
//       article.description = details.description;
//       article.releaseTime = details.releaseTime;
//       article.category = details.category;
//     } catch (error) {
//       console.error(`Failed to scrape details for article: ${article.title}`, error);
//     }
//   }

//   // Close the browser
//   await browser.close();

//   return news;
// }

// // Run the scraper
// scrapeNewRepublicLiberia()
//   .then(news => console.log(news))
//   .catch(err => console.error('Error:', err));
const puppeteer = require('puppeteer');

async function scrapeSmartNewsLiberia() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Step 1: Navigate to the latest news page
    await page.goto('https://smartnewsliberia.com/category/latest-news/', {
        waitUntil: 'networkidle2',
    });

    // Step 2: Scrape the titles and links
    const newsLinks = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.td-big-grid-flex-post'));
        return items.map(item => {
            const titleElement = item.querySelector('.entry-title a');
            const title = titleElement ? titleElement.innerText : null;
            const link = titleElement ? titleElement.href : null;
            return { title, link };
        });
    });

    const articles = []; // Array to hold all articles

    // Step 3: Visit each news link and scrape details
    for (const news of newsLinks) {
        if (news.link) {
            await page.goto(news.link, { waitUntil: 'networkidle2' });

            const details = await page.evaluate(() => {
                const categoryElement = document.querySelector('.td-post-category');
                const dateElement = document.querySelector('.entry-date');
                const releaseTimeElement = dateElement ? dateElement.getAttribute('datetime') : null; // Get the datetime attribute
                const descriptionElements = document.querySelectorAll('.td-post-content p'); // Selecting all paragraphs
                const imageElement = document.querySelector('.tdb_single_featured_image img');

                // Get the first two paragraphs for the description
                const description = Array.from(descriptionElements)
                    .slice(0, 2) // Get the first two paragraphs
                    .map(p => p.innerText)
                    .join('\n'); // Join them with a newline

                // Get the image URL
                const imageUrl = imageElement ? imageElement.src : null;

                return {
                    category: categoryElement ? categoryElement.innerText : null,
                    releaseTime: releaseTimeElement || 'No release time available.',
                    description: description || 'No description available.',
                    imageUrl: imageUrl || 'No image available.',
                };
            });

            // Push the details into the articles array
            articles.push({
                title: news.title,
                link: news.link,
                ...details,
                source: 'Smart News Liberia',
            });
        }
    }

    await browser.close();
    return articles; // Return the articles array
}

// Call the function and log the scraped news
scrapeSmartNewsLiberia()
    .then(articles => console.log(articles))
    .catch(error => console.error('Error scraping news:', error));
