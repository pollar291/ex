const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { register, login, createBook, booksByUser, getAllUserBooks,updateBooks } = require('./routes')

const pool = new Pool({
    user: 'root',
    host: '192.168.1.136',
    database: 'polina-exam-project',
    password: 'root',
    port: 5432,
});

pool.connect((err) => {
    if (err) {
        console.error('DB connection error: ', err.message);
    } else {
        console.log('DB connection successful');
    }
});

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/register', async (req, res) => register(pool, req, res));
app.post('/login', async (req, res) => login(pool, req, res));

app.post('/book', async (req, res) => createBook(pool, req, res));
app.get('/books', async (req, res) => booksByUser(pool, req, res));
app.get('/admin/books', async (req, res) => getAllUserBooks(pool, req, res));
app.put('/admin/books/:id', async (req, res) =>updateBooks(pool, req, res));

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
