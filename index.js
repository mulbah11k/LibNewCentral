const express = require("express");
const path = require("path");

const app = express();
const port = 4000;

// Serve static files (CSS, JS, images) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML files from the view directory

// Route for the index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'index.html'));
});
// Route for the about page
app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'about.html'));
});

// Route for the blog page
app.get('/blog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'blog.html'));
});

// Route for the details page
app.get('/details.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'details.html'));
});

// Route for the categori page
app.get('/categori.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'categori.html'));
});

// Route for the latest news page
app.get('/latest_news.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'latest_news.html'));
});

// Route for the single blog page
app.get('/single-blog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'single-blog.html'));
});

// Route for the elements page
app.get('/elements.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'elements.html'));
});

// Route for the main page
app.get('/main.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'main.html'));
});

// Route for the contact page
app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'contact.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
