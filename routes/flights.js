// ============================================
//  راوتس البحث عن الرحلات
//  هنا بنستقبل طلبات البحث ونرجع النتائج
// ============================================

const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const amadeusService = require('../services/amadeusService');
const kiwiService = require('../services/kiwiService');
const { removeDuplicates, markBestDeal } = require('../utils/helpers');

// الكاش: بيحفظ النتائج مؤقتاً عشان ما نضغطش على الـ API كتير
const cache = new NodeCache({
    stdTTL: parseInt(process.env.CACHE_DURATION) || 1800 // 30 دقيقة
});

// ============================================
// GET /api/flights/search?from=CAI&to=JED&date=2025-02-15
// ============================================
router.get('/search', async (req, res) => {
    try {
        // 1) نقرأ البيانات اللي المستخدم بعتها
        const {
            from = 'CAI',       // مطار المغادرة
            to = 'JED',         // مطار الوصول
            date,               // تاريخ السفر
            passengers = 1,     // عدد المسافرين
            cabinClass = 'ECONOMY'  // درجة السفر
        } = req.query;

        // 2) نتأكد إن التاريخ موجود
        if (!date) {
            return res.status(400).json({
                error: '❌ لازم تحدد تاريخ السفر',
                example: '/api/flights/search?from=CAI&to=JED&date=2025-07-15'
            });
        }

        // 3) نشوف لو النتيجة موجودة في الكاش
        const cacheKey = `${from}-${to}-${date}-${passengers}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log('📦 نتائج من الكاش');
            return res.json({ ...cached, cached: true });
        }

        console.log(`\n🔍 بحث: ${from} ✈️ ${to} | التاريخ: ${date}\n`);

        // 4) نبحث في كل المصادر في نفس الوقت
        const searchParams = {
            from, to, date,
            passengers: parseInt(passengers),
            cabinClass
        };

        const results = await Promise.allSettled([
            amadeusService.search(searchParams),
            kiwiService.search(searchParams)
        ]);

        // 5) نجمع النتائج
        let allFlights = [];
        const sources = [];
        const sourceNames = ['Amadeus', 'Kiwi'];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                allFlights = [...allFlights, ...result.value];
                sources.push({
                    name: sourceNames[index],
                    count: result.value.length,
                    status: 'success'
                });
                console.log(`  ✅ ${sourceNames[index]}: ${result.value.length} رحلة`);
            } else {
                sources.push({
                    name: sourceNames[index],
                    count: 0,
                    status: 'failed',
                    error: result.reason?.message || 'لا توجد نتائج'
                });
                console.log(`  ⚠️ ${sourceNames[index]}: فشل - ${result.reason?.message || 'لا توجد نتائج'}`);
            }
        });

        // 6) ننظف النتائج
        allFlights = removeDuplicates(allFlights);
        allFlights = markBestDeal(allFlights);
        allFlights.sort((a, b) => a.price - b.price);

        console.log(`\n  📊 إجمالي: ${allFlights.length} رحلة\n`);

        // 7) نجهز الرد
        const response = {
            success: true,
            totalResults: allFlights.length,
            sources,
            flights: allFlights,
            searchedAt: new Date().toISOString(),
            cached: false
        };

        // 8) نحفظ في الكاش
        if (allFlights.length > 0) {
            cache.set(cacheKey, response);
        }

        res.json(response);

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        res.status(500).json({
            error: 'حدث خطأ أثناء البحث',
            message: error.message
        });
    }
});

// ============================================
// GET /api/flights/airports
// قائمة المطارات المتاحة
// ============================================
router.get('/airports', (req, res) => {
    res.json({
        egypt: [
            { code: 'CAI', city: 'القاهرة', name: 'مطار القاهرة الدولي' },
            { code: 'ALY', city: 'الإسكندرية', name: 'مطار برج العرب' },
            { code: 'SSH', city: 'شرم الشيخ', name: 'مطار شرم الشيخ' },
            { code: 'HRG', city: 'الغردقة', name: 'مطار الغردقة' }
        ],
        saudiArabia: [
            { code: 'JED', city: 'جدة', name: 'مطار الملك عبدالعزيز' },
            { code: 'RUH', city: 'الرياض', name: 'مطار الملك خالد' },
            { code: 'DMM', city: 'الدمام', name: 'مطار الملك فهد' },
            { code: 'MED', city: 'المدينة المنورة', name: 'مطار الأمير محمد' }
        ]
    });
});

module.exports = router;