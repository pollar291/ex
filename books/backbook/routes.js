const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const ADMIN_LOGIN = 'car';

const register = async (pool, req, res) => {
    const { login, password, email, phone, full_name } = req.body;

    if (!login || !password || !email || !phone || !full_name) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const user = await pool.query('SELECT id FROM users WHERE login = $1', [login]);

        if (user.rowCount > 0) {
            return res.status(409).json({ message: 'Такой пользователь уже существует!' });
        }

        var role = 'user'
        if(login === ADMIN_LOGIN){
            role = 'admin'
        }

        const hashedPassword = bcrypt.hashSync(password, 8);
        const result = await pool.query(
            'INSERT INTO users (login, password, email, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [login, hashedPassword, email, phone, full_name, role]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            userId: result.rows[0].id,
        });
    } catch (err) {
        console.error('User register error:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const login = async (pool, req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: 'Логин или пароль обязательны!' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Неправильный логин или пароль' });
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Неправильный логин или пароль' });
        }

        await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

        const generatedToken = uuidv4();
        const sessionResult = await pool.query(
            'INSERT INTO sessions (uuid, user_id) VALUES ($1, $2) RETURNING *',
            [generatedToken, user.id]
        );

        const session = sessionResult.rows[0];

        res.json({ token: session.uuid, userId: session.user_id });
    } catch (err) {
        console.error('User login error:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const createBook = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Token пустой!' });
        }

        const result = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = result.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Вы не авторизованы!' });
        }

        const userId = sessionResult.user_id;
        const { name, author } = req.body;

        if (!name || !author ) {
            return res.status(400).json({ message: 'Заполнены не все поля!' });
        }

        await pool.query(
            'INSERT INTO books (name, author, user_id, status) VALUES ($1, $2, $3, $4)',
            [name, author, userId, 'created']
        );
        res.status(201).json({ message: 'Книга успешно создана' });
    } catch (err) {
        console.error('User create book error:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const booksByUser = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Token пустой!' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Вы не авторизованы!' });
        }

        const userId = sessionResult.user_id;

        const result = await pool.query('SELECT * FROM books WHERE user_id = $1', [userId]);
        res.json({ books: result.rows });
    } catch (err) {
        console.error('User get books error:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};


const getAllUserBooks = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Token пустой!' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Вы не авторизованы!' });
        }

        const userId = sessionResult.user_id;

        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows[0].role !== 'admin') {
            return res.status(403)
        }

        const result = await pool.query("SELECT * FROM users u JOIN books b ON b.user_id = u.id WHERE u.role != 'admin'");
        res.json({ result: result.rows });
    } catch (err) {
        console.error('Error fetching applications:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const updateBooks = async (pool, req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {

        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Token пустой!' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Вы не авторизованы!' });
        }

        const userId = sessionResult.user_id;

        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows[0].role !== 'admin') {
            return res.status(403)
        }

        await pool.query('UPDATE books SET status = $1 WHERE id = $2', [status, id]);
        return;
    } catch (err) {
        console.error('Error updating application status:', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};


module.exports = {
    register,
    login,
    createBook,
    booksByUser,
    getAllUserBooks,
    updateBooks
};