const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/test', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

app.listen(PORT, () => {
    console.log('Сайт запущен на порту ' + PORT);
});
