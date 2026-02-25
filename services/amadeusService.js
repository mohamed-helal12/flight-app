// ============================================
//  خدمة Amadeus API
//  دي أكبر شركة بيانات طيران في العالم
//  بتوفر أسعار حقيقية من شركات الطيران مباشرة
// ============================================

const Amadeus = require('amadeus');

// --- أسماء شركات الطيران بالعربي ---
const AIRLINES = {
    'MS': { name: 'مصر للطيران', color: '#1a3a6b', rating: 4.0 },
    'SV': { name: 'الخطوط السعودية', color: '#006c35', rating: 4.3 },
    'XY': { name: 'طيران ناس', color: '#e31837', rating: 3.7 },
    'F3': { name: 'طيران أديل', color: '#6b2fa0', rating: 3.5 },
    'EK': { name: 'طيران الإمارات', color: '#d71921', rating: 4.8 },
    'EY': { name: 'الاتحاد للطيران', color: '#c6a24b', rating: 4.6 },
    'QR': { name: 'الخطوط القطرية', color: '#5c0632', rating: 4.7 },
    'FZ': { name: 'فلاي دبي', color: '#f26522', rating: 3.9 },
    'G9': { name: 'طيران العربية', color: '#e8451e', rating: 3.4 },
    'TK': { name: 'الخطوط التركية', color: '#c70a0c', rating: 4.2 },
    'RJ': { name: 'الملكية الأردنية', color: '#1a1a6b', rating: 3.8 },
    'WY': { name: 'الطيران العماني', color: '#6b6b6b', rating: 4.0 },
    'KU': { name: 'الخطوط الكويتية', color: '#00457c', rating: 3.6 },
    'NE': { name: 'نسما للطيران', color: '#00205b', rating: 3.5 }
};

// --- أسماء المدن بالعربي ---
const CITIES = {
    'CAI': 'القاهرة', 'ALY': 'الإسكندرية',
    'SSH': 'شرم الشيخ', 'HRG': 'الغردقة',
    'JED': 'جدة', 'RUH': 'الرياض',
    'DMM': 'الدمام', 'MED': 'المدينة المنورة',
    'AHB': 'أبها', 'TIF': 'الطائف',
    'DXB': 'دبي', 'AUH': 'أبوظبي',
    'DOH': 'الدوحة', 'AMM': 'عمّان',
    'IST': 'إسطنبول', 'SHJ': 'الشارقة',
    'BAH': 'البحرين', 'MCT': 'مسقط'
};

// --- تهيئة Amadeus ---
let amadeus = null;

try {
    if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET,
            hostname: 'test'  // 'test' للتجربة | 'production' للإنتاج
        });
        console.log('  ✅ Amadeus API جاهز');
    } else {
        console.log('  ⚠️ Amadeus API: مفيش مفاتيح');
    }
} catch (err) {
    console.log('  ❌ Amadeus API: خطأ في التهيئة');
}

// ============================================
//  دالة البحث عن الرحلات
// ============================================
async function search(params) {
    // لو مفيش Amadeus، نرجع مصفوفة فاضية
    if (!amadeus) {
        return [];
    }

    try {
        // نبعت الطلب لـ Amadeus
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: params.from,          // مطار المغادرة
            destinationLocationCode: params.to,       // مطار الوصول
            departureDate: params.date,               // التاريخ
            adults: params.passengers,                // عدد المسافرين
            travelClass: params.cabinClass,           // درجة السفر
            currencyCode: 'EGP',                      // العملة: جنيه مصري
            max: 25                                   // أقصى عدد نتائج
        });

        // نحوّل كل نتيجة لشكل موحد
        const flights = response.data.map((offer, index) => {
            // أول قطعة من الرحلة (المغادرة)
            const firstSegment = offer.itineraries[0].segments[0];
            // آخر قطعة (الوصول)
            const lastSegment = offer.itineraries[0].segments[
                offer.itineraries[0].segments.length - 1
            ];

            // كود شركة الطيران
            const airlineCode = firstSegment.carrierCode;
            const airlineInfo = AIRLINES[airlineCode] || {
                name: airlineCode,
                color: '#666',
                rating: 3.5
            };

            // عدد التوقفات
            const numStops = offer.itineraries[0].segments.length - 1;

            // حساب المدة
            const duration = offer.itineraries[0].duration; // مثال: PT2H30M
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const hours = parseInt(match?.[1] || 0);
            const minutes = parseInt(match?.[2] || 0);
            const totalMinutes = hours * 60 + minutes;

            // معلومات التوقفات
            let stopsText = 'بدون توقف';
            if (numStops > 0) {
                const stopCities = offer.itineraries[0].segments
                    .slice(0, -1)
                    .map(s => CITIES[s.arrival.iataCode] || s.arrival.iataCode);
                stopsText = `توقف في ${stopCities.join(' و ')}`;
            }

            // السعر
            const price = Math.round(parseFloat(offer.price.total));
            const originalPrice = Math.round(price * 1.25); // السعر الأصلي (تقديري)

            // الأمتعة
            let baggageInfo = '23 كجم + حقيبة يد';
            const fareDetails = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
            if (fareDetails?.includedCheckedBags) {
                const bags = fareDetails.includedCheckedBags;
                if (bags.weight) {
                    baggageInfo = `${bags.weight} كجم + حقيبة يد`;
                }
            }

            // بناء المميزات
            const features = buildFeatures(airlineCode, numStops, baggageInfo);

            return {
                id: `amadeus-${index}`,
                source: 'Amadeus',
                airline: airlineInfo.name,
                airlineCode: airlineCode,
                logoColor: airlineInfo.color,
                rating: airlineInfo.rating,
                from: firstSegment.departure.iataCode,
                fromCity: CITIES[firstSegment.departure.iataCode] || firstSegment.departure.iataCode,
                to: lastSegment.arrival.iataCode,
                toCity: CITIES[lastSegment.arrival.iataCode] || lastSegment.arrival.iataCode,
                departTime: firstSegment.departure.at.substring(11, 16),
                arriveTime: lastSegment.arrival.at.substring(11, 16),
                duration: `${hours}:${String(minutes).padStart(2, '0')}`,
                durationMin: totalMinutes,
                stops: numStops,
                type: numStops === 0 ? 'مباشر' : stopsText,
                isDirect: numStops === 0,
                price: price,
                originalPrice: originalPrice,
                currency: 'ج.م',
                discount: Math.round(((originalPrice - price) / originalPrice) * 100),
                seatsLeft: offer.numberOfBookableSeats || null,
                features: features,
                details: {
                    flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
                    aircraft: firstSegment.aircraft?.code || 'غير محدد',
                    baggage: baggageInfo,
                    meal: getMealInfo(airlineCode),
                    entertainment: getEntertainmentInfo(airlineCode),
                    legroom: getLegroomInfo(airlineCode),
                    cancellation: 'راجع شروط التذكرة',
                    usb: getUsbInfo(airlineCode),
                    stops: stopsText,
                    lastTicketingDate: offer.lastTicketingDate || '-'
                },
                isBestDeal: false
            };
        });

        return flights;

    } catch (error) {
        console.error('  ❌ Amadeus خطأ:', error.response?.data?.errors?.[0]?.detail || error.message);
        return [];
    }
}

// ============================================
//  دوال مساعدة لبناء المميزات
// ============================================

function buildFeatures(airlineCode, numStops, baggageInfo) {
    const features = [];
    const premium = ['SV', 'EK', 'EY', 'QR', 'TK'];
    const budget = ['XY', 'F3', 'G9'];

    // الأمتعة
    features.push({
        text: `أمتعة ${baggageInfo.split('+')[0].trim()}`,
        icon: 'fa-suitcase-rolling',
        color: 'blue'
    });

    // الوجبات
    if (premium.includes(airlineCode)) {
        features.push({ text: 'وجبة فاخرة', icon: 'fa-utensils', color: 'green' });
    } else if (!budget.includes(airlineCode)) {
        features.push({ text: 'وجبة مجانية', icon: 'fa-utensils', color: 'green' });
    } else {
        features.push({ text: 'وجبة بمقابل', icon: 'fa-utensils', color: 'orange' });
    }

    // الترفيه
    if (premium.includes(airlineCode)) {
        features.push({ text: 'ترفيه متكامل', icon: 'fa-film', color: 'purple' });
    } else if (['MS', 'FZ'].includes(airlineCode)) {
        features.push({ text: 'شاشة ترفيه', icon: 'fa-tv', color: 'purple' });
    }

    // واي فاي
    if (['SV', 'EK', 'EY', 'QR'].includes(airlineCode)) {
        features.push({ text: 'واي فاي', icon: 'fa-wifi', color: 'orange' });
    }

    // رحلة مباشرة
    if (numStops === 0) {
        features.push({ text: 'رحلة مباشرة', icon: 'fa-check-circle', color: 'green' });
    }

    return features;
}

function getMealInfo(code) {
    const premium = ['SV', 'EK', 'EY', 'QR', 'TK'];
    const budget = ['XY', 'F3', 'G9'];
    if (premium.includes(code)) return 'وجبة فاخرة + حلوى + مشروبات';
    if (budget.includes(code)) return 'وجبات ومشروبات للشراء';
    return 'وجبة ساخنة + مشروبات';
}

function getEntertainmentInfo(code) {
    const premium = ['SV', 'EK', 'EY', 'QR'];
    if (premium.includes(code)) return 'نظام ترفيه متكامل - مئات القنوات';
    if (['MS', 'TK', 'FZ'].includes(code)) return 'شاشة شخصية';
    return 'غير متوفر';
}

function getLegroomInfo(code) {
    const premium = ['SV', 'EK', 'EY', 'QR'];
    if (premium.includes(code)) return '84 سم';
    if (['MS', 'TK'].includes(code)) return '79 سم';
    return '76 سم';
}

function getUsbInfo(code) {
    const premium = ['SV', 'EK', 'EY', 'QR'];
    if (premium.includes(code)) return 'USB + Type-C + كهرباء';
    if (['MS', 'TK', 'FZ'].includes(code)) return 'USB متوفر';
    return 'غير متوفر';
}

module.exports = { search };