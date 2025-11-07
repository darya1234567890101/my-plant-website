const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Используем порт от Railway или 3000

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Исправлен путь

// Настройки подключения к MySQL для Railway
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'my_plant_website',
    port: process.env.MYSQLPORT || 3306
};

// Создаем подключение к базе данных
const connection = mysql.createConnection(dbConfig);

// Функция для инициализации базы данных
function initializeDatabase() {
    connection.connect((err) => {
        if (err) {
            console.log('Ошибка подключения к MySQL:', err.message);
            // Переподключаемся через 5 секунд
            setTimeout(initializeDatabase, 5000);
            return;
        }
        console.log('Подключение к MySQL серверу успешно!');
        console.log('Настройки подключения:', {
            host: dbConfig.host,
            database: dbConfig.database,
            port: dbConfig.port
        });

        // Создаем базу данных если не существует (только для локальной разработки)
        if (dbConfig.host === 'localhost') {
            connection.query('CREATE DATABASE IF NOT EXISTS my_plant_website', (err) => {
                if (err) {
                    console.log('Ошибка создания БД:', err.message);
                    return;
                }
                console.log('База данных my_plant_website создана/уже существует');
                useDatabase();
            });
        } else {
            // На Railway база уже создана, просто используем ее
            useDatabase();
        }
    });
}

function useDatabase() {
    connection.query('USE my_plant_website', (err) => {
        if (err) {
            console.log('Ошибка выбора БД:', err.message);
            // Если базы нет, создаем таблицы в текущей базе
            createTables();
            return;
        }
        console.log('Используем базу данных my_plant_website');
        createTables();
    });
}

function createTables() {
    // Таблица 1: Пользователи
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Таблица 2: Заказы
    const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            customer_note TEXT,
            product_name VARCHAR(100) NOT NULL,
            product_price DECIMAL(10,2) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    connection.query(createUsersTable, (err) => {
        if (err) console.log('Ошибка создания таблицы users:', err.message);
        else console.log('Таблица users создана/уже существует');
    });

    connection.query(createOrdersTable, (err) => {
        if (err) console.log('Ошибка создания таблицы orders:', err.message);
        else console.log('Таблица orders создана/уже существует');
    });
}

// Остальные endpoints остаются без изменений
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Пожалуйста, введите корректный email!' });
    }

    const checkUser = "SELECT * FROM users WHERE email = ?";
    connection.query(checkUser, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует!' });
        }

        const insertUser = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        connection.query(insertUser, [name, email, password], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при регистрации' });
            }

            res.json({
                success: true,
                message: 'Регистрация успешна!',
                user: { id: results.insertId, name: name }
            });
        });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    const findUser = "SELECT * FROM users WHERE email = ? AND password = ?";
    connection.query(findUser, [email, password], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль!' });
        }

        const user = results[0];
        res.json({
            success: true,
            message: 'Вход выполнен успешно!',
            user: { id: user.id, name: user.name }
        });
    });
});

app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, customer_phone, customer_note, products, total_amount } = req.body;

    if (!customer_name || !customer_phone || !products) {
        return res.status(400).json({ error: 'Заполните обязательные поля: имя, телефон и товары!' });
    }

    const insertOrder = `
        INSERT INTO orders (user_id, customer_name, customer_phone, customer_note, product_name, product_price, quantity, total_amount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    let productName = 'Товар';
    let productPrice = 0;
    let quantity = 1;

    if (Array.isArray(products) && products.length > 0) {
        const product = products[0];
        productName = product.name || 'Товар';
        productPrice = parseFloat(product.price) || 0;
        quantity = parseInt(product.quantity) || 1;
    } else if (typeof products === 'string') {
        productName = products;
    } else if (products && typeof products === 'object') {
        productName = products.name || 'Товар';
        productPrice = parseFloat(products.price) || 0;
        quantity = parseInt(products.quantity) || 1;
    }

    connection.query(insertOrder, [
        user_id || null,
        customer_name,
        customer_phone,
        customer_note || '',
        productName,
        parseFloat(productPrice) || 0,
        parseInt(quantity) || 1,
        parseFloat(total_amount) || 0
    ], (err, results) => {
        if (err) {
            console.log('Ошибка сохранения заказа:', err.message);
            return res.status(500).json({ error: 'Ошибка при сохранении заказа' });
        }

        res.json({
            success: true,
            message: 'Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.',
            order: { id: results.insertId }
        });
    });
});

app.get('/api/orders/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const getOrders = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    
    connection.query(getOrders, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки заказов' });
        }
        res.json(results);
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает успешно!', 
        tables: ['users', 'orders'],
        status: 'OK',
        database: 'MySQL',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/check-db', (req, res) => {
    connection.query('SELECT 1 as test', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка БД: ' + err.message });
        }
        res.json({ 
            message: 'MySQL подключен успешно',
            test: results[0].test,
            status: 'OK'
        });
    });
});

app.get('/api/users', (req, res) => {
    connection.query('SELECT id, name, email, created_at FROM users', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки пользователей' });
        }
        res.json(results);
    });
});

app.get('/api/all-orders', (req, res) => {
    connection.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки заказов' });
        }
        res.json(results);
    });
});

// Обработка ошибок подключения к БД
connection.on('error', (err) => {
    console.log('Ошибка MySQL:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Переподключаемся к базе данных...');
        initializeDatabase();
    }
});

// Инициализация базы данных и запуск сервера
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Используется MySQL база данных');
    console.log('Создано 2 таблицы: users и orders');
    console.log('Доступные API endpoints:');
    console.log('/api/test - Проверка сервера');
    console.log('/api/check-db - Проверка базы данных');
    console.log('/api/auth/register - Регистрация');
    console.log('/api/auth/login - Вход');
    console.log('/api/orders - Создание заказа');
});
