require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const flightRoutes = require('./routes/flights');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// يقدم ملفات الواجهة
app.use(express.static(path.join(__dirname, 'public')));

// الراوتس
app.use('/api/flights', flightRoutes);

// فحص السيرفر
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '✈️ Flight API is running!',
        time: new Date().toISOString()
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ⭐ مهم لـ Vercel: نصدّر التطبيق
module.exports = app;

// ⭐ وكمان نشغله لو محلي
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✈️ Server running on http://localhost:${PORT}`);
    });
}