// функции для работы с localstorage
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('ошибка чтения из localstorage:', e);
        return [];
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('ошибка сохранения в localstorage:', e);
        return false;
    }
}

// получение цены по названию
function getPriceByName(productName) {
    const prices = {
        'монстера деликатесная': 2500,
        'фикус бенджамина': 1800,
        'замиокулькас': 1200,
        'спатифиллум': 900,
        'драцена маргината': 2100,
        'алоэ вера': 600,
        'хлорофитум': 450,
        'фикус лирата': 3400,
        'сансевиерия': 800,
        'антуриум': 1500,
        'каланхоэ': 550,
        'пеперомия': 750
    };
    return prices[productName] || 0;
}

//основная инициализация сайта
document.addEventListener('DOMContentLoaded', function () {
    //этот код выполнится когда вся html-страница загрузится

    //яндекс.карты 
    initYandexMap();

    // фильтрация товаров 
    // находим кнопку фильтра и элементы выбора
    const filterBtn = document.querySelector('.filter-btn');
    const priceFilter = document.getElementById('price');
    const sizeFilter = document.getElementById('size');
    // находим все карточки товаров на странице
    const productCards = document.querySelectorAll('.product-card');

    // функция для фильтрации товаров
    function filterProducts() {
        // получаем выбранные значения фильтров
        const priceValue = priceFilter ? priceFilter.value : 'all';
        const sizeValue = sizeFilter ? sizeFilter.value : 'any';

        //перебираем все карточки товаров
        productCards.forEach(card => {
            // получаем цену и размер товара из атрибутов data-
            const productPrice = parseInt(card.getAttribute('data-price'));
            const productSize = card.getAttribute('data-size');
            // изначально показываем все карточки
            let show = true;

            // фильтр по цене
            if (priceValue !== 'all') {
                // проверяем разные диапазоны цен
                if (priceValue === '0-1000' && productPrice > 1000) show = false;
                if (priceValue === '1000-2000' && (productPrice <= 1000 || productPrice > 2000)) show = false;
                if (priceValue === '2000+' && productPrice <= 2000) show = false;
            }

            // фильтр по размеру
            if (sizeValue !== 'any' && productSize !== sizeValue) {
                show = false;
            }

            // показываем или скрываем карточку в зависимости от фильтров
            card.style.display = show ? 'block' : 'none';
        });
    }

    // добавляем обработчики событий на элементы фильтрации
    if (filterBtn) filterBtn.addEventListener('click', filterProducts);
    if (priceFilter && sizeFilter) {
        priceFilter.addEventListener('change', filterProducts);
        sizeFilter.addEventListener('change', filterProducts);
    }

    // корзина (добавление товаров) 
    // находим все кнопки "добавить в корзину"
    const addToCartButtons = document.querySelectorAll('.add-cart');

    // пересоздаем кнопки чтобы сбросить старые обработчики событий
    addToCartButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });

    // добавляем новые обработчики на все кнопки корзины
    document.querySelectorAll('.add-cart').forEach(button => {
        button.addEventListener('click', function () {
            // получаем название и цену товара из атрибутов data-
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');

            // загружаем текущую корзину из хранилища
            let cart = loadFromStorage('cart');
            // ищем товар в корзине по названию
            const existingItemIndex = cart.findIndex(item => item.name === productName);

            // если товар уже есть в корзине
            if (existingItemIndex !== -1) {
                // увеличиваем количество на 1
                cart[existingItemIndex].quantity += 1;
            } else {
                // добавляем новый товар в корзину
                cart.push({ name: productName, price: productPrice, quantity: 1 });
            }

            // сохраняем обновленную корзину
            if (saveToStorage('cart', cart)) {
                // добавляем класс для анимации
                this.classList.add('added');
                // через 400ms убираем класс анимации
                setTimeout(() => this.classList.remove('added'), 400);
                // показываем сообщение об успешном добавлении
                alert('товар "' + productName + '" добавлен в корзину!');
            }
        });
    });

    // авторизация 
    // переключение вкладок
    const authTabs = document.querySelectorAll('.auth-tab');
    if (authTabs.length > 0) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                // получаем id вкладки из атрибута data-tab
                const tabId = this.getAttribute('data-tab');
                // убираем активный класс со всех вкладок
                authTabs.forEach(t => t.classList.remove('active'));
                // скрываем все формы
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                // делаем текущую вкладку активной
                this.classList.add('active');
                // показываем соответствующую форму
                document.getElementById(tabId + 'Form').classList.add('active');
            });
        });
    }

    // обновление шапки пользователя
    updateUserHeader();

    // api: погода и факты 
    if (document.getElementById('weatherTips')) loadWeatherTips();
    if (document.getElementById('plantFact')) loadRandomPlantFact();

    // анимации 
    addAnimations();

    // инициализация корзины
    if (document.querySelector('.cart-summary')) {
        updateCartDisplay();
        initOrderForm();
    }
});

//  функции 
// яндекс.карты
function initYandexMap() {
    // находим контейнер для карты
    const mapContainer = document.getElementById('map');
    // если контейнера нет, выходим из функции
    if (!mapContainer) return;

    // проверяем, не загружены ли карты уже
    if (typeof ymaps === 'undefined') {
        // динамически загружаем api яндекс.карт
        const script = document.createElement('script');
        // указываем источник скрипта
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=ваш_api_ключ&lang=ru_RU';
        // когда скрипт загрузится, создаем карту
        script.onload = function () {
            ymaps.ready(createMap);
        };
        // добавляем скрипт в head страницы
        document.head.appendChild(script);
    } else {
        // карты уже загружены, сразу создаем карту
        ymaps.ready(createMap);
    }

    function createMap() {
        // создаем карту в указанном контейнере
        const myMap = new ymaps.Map("map", {
            // координаты магазина (санкт-петербург)
            center: [59.934280, 30.335098],
            // уровень масштабирования
            zoom: 15,
            // элементы управления картой
            controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
        });

        // создаем метку для магазина
        const myPlacemark = new ymaps.Placemark([59.934280, 30.335098], {
            // текст при наведении
            hintContent: 'Zelaina Магазин',
            // содержимое балуна (всплывающего окна)
            balloonContent: `
                <strong>Zelaina Магазин</strong><br>
                санкт-петербург, ул. цветочная, 10<br>
                станция метро "цветочная"<br>
                ежедневно 10:00-20:00<br>
                +7 (912) 123-45-67
            `
        }, {
            // стиль метки
            preset: 'islands#redDotIcon'
        });

        // добавляем метку на карту
        myMap.geoObjects.add(myPlacemark);
        // открываем балун с информацией
        myPlacemark.balloon.open();
    }
}

// авторизация с базой данных
// адрес сервера для авторизации
const API_URL = 'http://localhost:3000/api/auth';

// регистрация
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
        // предотвращаем стандартную отправку формы
        e.preventDefault(); // чтобы страница не перезагружалась

        // получаем значения полей формы
        const name = this.querySelector('input[name="name"]').value;
        const email = this.querySelector('input[name="email"]').value;
        const password = this.querySelector('input[name="password"]').value;
        const confirmPassword = this.querySelector('input[name="confirmPassword"]').value;

        // валидация пароля
        if (password.length < 6) {
            alert('пароль должен быть не менее 6 символов!');
            return;
        }

        // проверка совпадения паролей
        if (password !== confirmPassword) {
            alert('пароли не совпадают! пожалуйста, проверьте введенные данные.');
            return;
        }
        // берем значения из полей ввода и упаковываем в формат, который понимает сервер
        try {
            // отправляем запрос на регистрацию
            const response = await fetch(`${API_URL}/register`, { //адрес сервера + путь для регистрации
                method: 'POST', //тип запроса (отправка данных)
                headers: { //дополнительные настройки запроса
                    'Content-Type': 'application/json', //отправлем данные в формате JSON
                },
                // преобразуем данные в json
                body: JSON.stringify({ name, email, password }) //превращает объект в строку
            });

            // получаем ответ от сервера
            const data = await response.json();

            if (data.success) {
                // сохраняем данные пользователя в локальное хранилище
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                // показываем сообщение об успехе
                alert(data.message + ' добро пожаловать, ' + name + '!');
                // переходим на главную страницу
                window.location.href = 'index.html';
            } else {
                // показываем сообщение об ошибке
                alert(data.error);
            }
        } catch (error) {
            // обрабатываем ошибки сети
            console.error('Error:', error);
            alert('ошибка соединения с сервером! проверьте, запущен ли backend.');
        }
    });
}

// вход
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        // предотвращаем стандартную отправку формы
        e.preventDefault();

        // получаем значения полей формы
        const email = this.querySelector('input[name="email"]').value;
        const password = this.querySelector('input[name="password"]').value;

        try {
            // отправляем запрос на вход
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // преобразуем данные в json
                body: JSON.stringify({ email, password })
            });

            // получаем ответ от сервера
            const data = await response.json();

            if (data.success) {
                // сохраняем данные пользователя в локальное хранилище
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                // показываем сообщение об успехе
                alert(data.message + ' добро пожаловать, ' + data.user.name + '!');
                // переходим на главную страницу
                window.location.href = 'index.html';
            } else {
                // показываем сообщение об ошибке
                alert(data.error);
            }
        } catch (error) {
            // обрабатываем ошибки сети
            console.error('Error:', error);
            alert('ошибка соединения с сервером! проверьте, запущен ли backend.');
        }
    });
}

// погода и советы
async function loadWeatherTips() {
    try {
        // запрашиваем данные о погоде с открытого api
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=59.94&longitude=30.31&current_weather=true&timezone=Europe/Moscow');
        const data = await response.json();
        // если получили данные о погоде, показываем советы
        if (data.current_weather) {
            displayPlantCareTips(data.current_weather.temperature, data.current_weather.windspeed);
        }
    } catch {
        // если не удалось получить погоду, используем демо-данные
        console.log('не удалось загрузить погоду, используем демо-данные');
        displayPlantCareTips(18, 5);
    }
}

function displayPlantCareTips(temperature, windSpeed) {
    // находим контейнер для советов
    const weatherTips = document.getElementById('weatherTips');
    // если контейнера нет, выходим
    if (!weatherTips) return;

    // создаем массив для советов
    let tips = [];

    // генерируем советы в зависимости от температуры
    if (temperature > 25) {
        tips.push('увеличьте полив — сегодня жарко');
        tips.push('притеняйте растения от прямого солнца');
    } else if (temperature < 15) {
        tips.push('переставьте растения ближе к окну');
        tips.push('уменьшите полив — растения отдыхают');
    } else {
        tips.push('идеальная температура для растений!');
        tips.push('полив в обычном режиме');
    }

    // добавляем совет про ветер если он сильный
    if (windSpeed > 10) {
        tips.push('уберите растения от сквозняков');
    }

    // вставляем сгенерированный html в контейнер
    weatherTips.innerHTML = `
        <div class="weather-tips">
            <h3>советы по уходу</h3>
            <p>температура: ${temperature}°c</p>
            <ul class="tips-list">
                ${tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    `;
}

// факты о растениях
function loadRandomPlantFact() {
    // массив случайных фактов о растениях
    const facts = [
        "растения повышают влажность воздуха на 5–10%",
        "зелёный цвет растений успокаивает нервную систему",
        "некоторые растения очищают воздух от токсинов",
        "растения снижают уровень стресса",
        "уход за растениями развивает ответственность"
    ];

    // выбираем случайный факт из массива
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    // находим контейнер для факта
    const factElement = document.getElementById('plantFact');
    // если контейнер есть, вставляем факт
    if (factElement) {
        factElement.innerHTML = `<div class="plant-fact">интересный факт: ${randomFact}</div>`;
    }
}

// анимации
function addAnimations() {
    // находим все ссылки которые начинаются с #
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // предотвращаем стандартное поведение ссылки
            e.preventDefault();
            // получаем id целевого элемента
            const targetId = this.getAttribute('href');
            // находим целевой элемент
            const targetElement = document.querySelector(targetId);
            // если элемент найден, плавно прокручиваем к нему
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // добавляем анимации для карточек товаров
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        // устанавливаем задержку анимации для каждой карточки (эффект волны)
        card.style.animationDelay = `${index * 0.1}s`;
        // добавляем класс анимации
        card.classList.add('fade-in');
    });

    // добавляем анимации для элементов корзины
    const cartItems = document.querySelectorAll('.cart-item');
    cartItems.forEach((item, index) => {
        // устанавливаем задержку анимации для каждого элемента
        item.style.animationDelay = `${index * 0.05}s`;
        // добавляем класс анимации
        item.classList.add('slide-in');
    });
}

// обновление шапки и выход
function updateUserHeader() {
    // получаем данные текущего пользователя из хранилища
    const currentUser = localStorage.getItem('currentUser');
    // находим ссылку авторизации в шапке
    const authLink = document.querySelector('a[href="auth.html"]');

    // если пользователь авторизован и ссылка найдена
    if (currentUser && authLink) {
        // преобразуем строку в объект
        const user = JSON.parse(currentUser);
        // меняем текст ссылки на "выйти (имя)"
        authLink.textContent = 'выйти (' + user.name + ')';
        // убираем стандартную ссылку
        authLink.href = '#';
        // добавляем обработчик для выхода
        authLink.onclick = function (e) {
            // предотвращаем переход по ссылке
            e.preventDefault();
            // удаляем данные пользователя
            localStorage.removeItem('currentUser');
            // переходим на главную страницу
            localStorage.removeItem('cart');
            window.location.href = 'index.html';
        };
    }
}

// работа с корзиной (изменение количества)
function changeQuantity(productName, change) {
    // загружаем текущую корзину
    let cart = loadFromStorage('cart');
    // ищем товар в корзине
    const item = cart.find(item => item.name === productName);

    // если товар найден
    if (item) {
        // изменяем количество (увеличиваем или уменьшаем)
        item.quantity = (item.quantity || 1) + change;
        // если количество стало 0 или меньше, удаляем товар из корзины
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.name !== productName);
        }
        // сохраняем обновленную корзину
        saveToStorage('cart', cart);

        // обновляем отображение корзины
        updateCartDisplay();
    }
}

// очистка корзины
function clearCart() {
    // удаляем корзину из хранилища
    localStorage.removeItem('cart');
    // обновляем отображение корзины
    updateCartDisplay();
}

// функции корзины

// обновление отображения корзины
function updateCartDisplay() {
    const cartSummary = document.querySelector('.cart-summary');
    if (!cartSummary) return;

    let cart = loadFromStorage('cart');

    if (cart && cart.length > 0) {
        const itemsHTML = cart.map(item => {
            const price = Number(item.price) || getPriceByName(item.name) || 0;
            const quantity = Number(item.quantity) || 1;
            const itemTotal = price * quantity;
            const safeName = (item.name || '').replace(/'/g, "\\'");

            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">${price} руб./шт.</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn minus" onclick="changeQuantity('${safeName}', -1)">−</button>
                        <span class="quantity">${quantity} шт.</span>
                        <button class="quantity-btn plus" onclick="changeQuantity('${safeName}', 1)">+</button>
                    </div>
                    <div class="cart-item-total">${itemTotal} руб.</div>
                </div>
            `;
        }).join('');

        const total = cart.reduce((sum, item) => {
            const price = Number(item.price) || getPriceByName(item.name) || 0;
            const quantity = Number(item.quantity) || 1;
            return sum + price * quantity;
        }, 0);

        cartSummary.innerHTML = `
            <div class="cart-items">${itemsHTML}</div>
            <div class="cart-footer">
                <div class="cart-total">
                    <strong>Итого: ${total} руб.</strong>
                    <button class="btn-clear" onclick="clearCart()">Очистить корзину</button>
                </div>
            </div>
        `;
    } else {
        cartSummary.innerHTML = `
            <div class="empty-cart">
                <p>В корзине пока нет товаров</p>
                <a href="product.html" class="btn btn-outline">Перейти в каталог</a>
            </div>
        `;
    }
}

// инициализация формы заказа
function initOrderForm() {
    const orderForm = document.querySelector('.feedback-form');
    if (!orderForm) return;

    orderForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const note = document.getElementById('client-note').value.trim();

        if (!name || !phone) {
            alert('пожалуйста, заполните имя и телефон!');
            return;
        }

        const cart = loadFromStorage('cart');
        if (!cart || cart.length === 0) {
            alert('добавьте товары в корзину перед оформлением заказа!');
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const user_id = currentUser ? currentUser.id : null;

        const products = cart.map(item => ({
            name: item.name,
            price: Number(item.price) || getPriceByName(item.name) || 0,
            quantity: Number(item.quantity) || 1
        }));

        const total = cart.reduce((sum, item) => {
            const price = Number(item.price) || getPriceByName(item.name) || 0;
            const quantity = Number(item.quantity) || 1;
            return sum + price * quantity;
        }, 0);

        try {
            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id,
                    customer_name: name,
                    customer_phone: phone,
                    customer_note: note,
                    products,
                    total_amount: total
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                orderForm.reset();
                clearCart();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                alert('ошибка: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('ошибка соединения с сервером! проверьте, запущен ли backend.');
        }
    });
}