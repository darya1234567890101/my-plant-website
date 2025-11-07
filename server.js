const express = require('express'); // для создания сервера
const mysql = require('mysql2'); // для работы с базой данных MySQL
const cors = require('cors'); // чтобы фронтенд мог общаться с сервером
const path = require('path'); //для работы с путями к файлам
//Создаем экземпляр приложения Express и указала порт 3000 для сервера
const app = express();
const PORT = 3000;

app.use(cors()); //разрешаю запросы с любого домена
app.use(express.json()); //сервер понимает JSON данные
app.use(express.static(path.join(__dirname, '../'))); //раздаю статические файлы (HTML, CSS, JS)

//Подключаюсь к MySQL серверу из XAMPP. Использую стандартные настройки: localhost, пользователь root, без пароля
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
});

// Функция для инициализации базы данных
function initializeDatabase() {
    connection.connect((err) => {
        if (err) {
            console.log('Ошибка подключения к MySQL:', err.message);
            return;
        }
        console.log('Подключение к MySQL серверу успешно!');

        // Создаем базу данных если не существует
        connection.query('CREATE DATABASE IF NOT EXISTS my_plant_website', (err) => {
            if (err) {
                console.log('Ошибка создания БД:', err.message);
                return;
            }
            console.log('База данных my_plant_website создана/уже существует');

            // Переключаемся на созданную базу данных
            connection.query('USE my_plant_website', (err) => {
                if (err) {
                    console.log('Ошибка выбора БД:', err.message);
                    return;
                }
                console.log('Используем базу данных my_plant_website');

                // Создаем 2 таблицы
                createTables();
            });
        });
    });
}

function createTables() {
    //Таблица 1: Пользователи (для авторизации)
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    //Таблица 2: Заказы (включает в себя информацию о товарах)
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

// Регистрация
app.post('/api/auth/register', (req, res) => { //обработка регистрации
    const { name, email, password } = req.body; //. Эта строка извлекает отдельные переменные

    if (!email || !email.includes('@')) { //проверка, что email заполнен и содержит символ '@'
        return res.status(400).json({ error: 'Пожалуйста, введите корректный email!' });
    }
//SQL запрос для проверки существования пользователя с таким email.? -это placeholder, который безопасно подставляет значение из массива email
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

app.post('/api/auth/login', (req, res) => { //обработка входа
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

// Сохранение заказа
app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, customer_phone, customer_note, products, total_amount } = req.body;

    if (!customer_name || !customer_phone || !products) {
        return res.status(400).json({ error: 'Заполните обязательные поля: имя, телефон и товары!' });
    }

    // Сохраняем каждый товар как отдельный заказ
    const insertOrder = `
        INSERT INTO orders (user_id, customer_name, customer_phone, customer_note, product_name, product_price, quantity, total_amount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    // Для простоты сохраняем первый товар из корзины
    let productName = 'Товар';
    let productPrice = 0;
    let quantity = 1;

    if (Array.isArray(products) && products.length > 0) {
        // Если пришел массив товаров
        const product = products[0];
        productName = product.name || 'Товар';
        productPrice = parseFloat(product.price) || 0;
        quantity = parseInt(product.quantity) || 1;
    } else if (typeof products === 'string') {
        // Если пришла строка (старый формат)
        productName = products;
    } else if (products && typeof products === 'object') {
        // Если пришел объект
        productName = products.name || 'Товар';
        productPrice = parseFloat(products.price) || 0;
        quantity = parseInt(products.quantity) || 1;
    }
    //SQL запрос, подставляя значения вместо ?
    //Использую || для default значений: если user_id нет - ставим null(гостевой заказ), если нет комментария - пустую строку
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

// Получение заказов пользователя
//GET endpoint с параметром URL. :user_id означает, что ID пользователя передается в URL
app.get('/api/orders/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const getOrders = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC"; //отсортировать по дате создания, сначала новые
    
    connection.query(getOrders, [userId], (err, results) => { //запрос sql, массив значений, возврат (ошибка или результат)
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки заказов' });
        }
        res.json(results);
    });
});

// Тестовые endpoints для проверки
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает успешно!', 
        tables: ['users', 'orders'],
        status: 'OK',
        database: 'MySQL'
    });
});

// Проверка подключения к базе данных
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

// Получение списка пользователей (для тестирования)
app.get('/api/users', (req, res) => {
    connection.query('SELECT id, name, email, created_at FROM users', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки пользователей' });
        }
        res.json(results);
    });
});

// Получение всех заказов (для тестирования)
app.get('/api/all-orders', (req, res) => {
    connection.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка загрузки заказов' });
        }
        res.json(results);
    });
});

//создание БД и таблицы,если их нет
//запуск сервера на указанном порту.Console.log выводят информацию для разработчика.
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log('Используется MySQL база данных');
    console.log('Создано 2 таблицы: users и orders');
    console.log('Доступные API endpoints:');
    console.log('/api/test - Проверка сервера');
    console.log('/api/check-db - Проверка базы данных');
    console.log('/api/auth/register - Регистрация');
    console.log('/api/auth/login - Вход');
    console.log('/api/all-orders - Создание заказа');
});