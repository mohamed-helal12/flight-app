// ============================================
//  خدمة Kiwi (Tequila) API
//  بتوفر أسعار من شركات طيران كتير
//  وبتديك رابط حجز مباشر
// ============================================

const axios = require('axios');

const API_KEY = process.env.KIWI_API_KEY;
const BASE_URL = 'https://api.tequila.kiwi.com/v2';

// سعر الدولار بالجنيه المصري (تقريبي)
const USD_TO_EGP = 49;

// أسماء شركات الطيران بالعربي
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
    'TK': { name: 'الخطوط التركية', color: '#c70a0c', rating: 4.2 }
};

const CITIES = {
    'CAI': 'القاهرة', 'ALY': 'الإسكندرية',
    'SSH': 'شرم الشيخ', 'HRG': 'الغردقة',
    'JED': 'جدة', 'RUH': 'الرياض',
    'DMM': 'الدمام', 'MED': 'المدينة المنورة'
};

async function search(params) {
    if (!API_KEY) {
        console.log('  ⚠️ Kiwi: مفيش API Key');
        return [];
    }

    try {
        // Kiwi بياخد التاريخ بتنسيق DD/MM/YYYY
        const [year, month, day] = params.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        const response = await axios.get(`${BASE_URL}/search`, {
            headers: {
                'apikey': API_KEY
            },
            params: {
                fly_from: params.from,
                fly_to: params.to,
                date_from: formattedDate,
                date_to: formattedDate,
                adults: params.passengers,
                curr: 'USD',
                limit: 20,
                sort: 'price',
                selected_cabins: 'M'  // M = Economy
            },
            timeout: 15000
        });

        if (!response.data?.data || response.data.data.length === 0) {
            return [];
        }

        const flights = response.data.data.map((flight, index) => {
            const airlineCode = flight.airlines?.[0] || 'XX';
            const airlineInfo = AIRLINES[airlineCode] || {
                name: airlineCode,
                color: '#666',
                rating: 3.5
            };

            // عدد التوقفات
            const numStops = (flight.route?.length || 1) - 1;

            // أوقات المغادرة والوصول
            const departDate = new Date(flight.dTime * 1000);
            const arriveDate = new Date(flight.aTime * 1000);
            const departTime = `${String(departDate.getHours()).padStart(2, '0')}:${String(departDate.getMinutes()).padStart(2, '0')}`;
            const arriveTime = `${String(arriveDate.getHours()).padStart(2, '0')}:${String(arriveDate.getMinutes()).padStart(2, '0')}`;

            // مدة الرحلة بالدقائق
            const durationMin = Math.round((flight.aTime - flight.dTime) / 60);
            const hours = Math.floor(durationMin / 60);
            const minutes = durationMin % 60;

            // السعر بالجنيه المصري
            const priceEGP = Math.round(flight.price * USD_TO_EGP);
            const originalPrice = Math.round(priceEGP * 1.2);

            // معلومات التوقفات
            let stopsText = 'بدون توقف';
            if (numStops > 0) {
                const stopCities = flight.route
                    .slice(0, -1)
                    .map(r => CITIES[r.flyTo] || r.cityTo || r.flyTo);
                stopsText = `توقف في ${stopCities.join(' و ')}`;
            }

            // المميزات
            const features = [];
            if (numStops === 0) {
                features.push({ text: 'رحلة مباشرة', icon: 'fa-check-circle', color: 'green' });
            }
            features.push({ text: 'رابط حجز مباشر', icon: 'fa-link', color: 'blue' });
            if (flight.availability?.seats && flight.availability.seats < 5) {
                features.push({ text: `${flight.availability.seats} مقاعد فقط!`, icon: 'fa-fire', color: 'red' });
            }

            return {
                id: `kiwi-${index}`,
                source: 'Kiwi',
                airline: airlineInfo.name,
                airlineCode: airlineCode,
                logoColor: airlineInfo.color,
                rating: airlineInfo.rating,
                from: flight.flyFrom,
                fromCity: CITIES[flight.flyFrom] || flight.cityFrom || flight.flyFrom,
                to: flight.flyTo,
                toCity: CITIES[flight.flyTo] || flight.cityTo || flight.flyTo,
                departTime: departTime,
                arriveTime: arriveTime,
                duration: `${hours}:${String(minutes).padStart(2, '0')}`,
                durationMin: durationMin,
                stops: numStops,
                type: numStops === 0 ? 'مباشر' : stopsText,
                isDirect: numStops === 0,
                price: priceEGP,
                originalPrice: originalPrice,
                currency: 'ج.م',
                discount: Math.round(((originalPrice - priceEGP) / originalPrice) * 100),
                seatsLeft: flight.availability?.seats || null,
                bookingLink: flight.deep_link || null,  // 🔗 رابط الحجز المباشر!
                features: features,
                details: {
                    flightNumber: flight.route?.[0] ?
                        `${airlineCode}${flight.route[0].flight_no}` : '-',
                    aircraft: 'غير محدد',
                    baggage: flight.baglimit?.hand_weight ?
                        `يد: ${flight.baglimit.hand_weight} كجم | شحن: ${flight.baglimit.hold_weight || 0} كجم` :
                        'راجع شركة الطيران',
                    meal: 'راجع شركة الطيران',
                    entertainment: 'راجع شركة الطيران',
                    legroom: 'قياسي',
                    cancellation: 'راجع شروط الحجز',
                    usb: 'غير محدد',
                    stops: stopsText,
                    lastTicketingDate: '-'
                },
                isBestDeal: false
            };
        });

        return flights;

    } catch (error) {
        console.error('  ❌ Kiwi خطأ:', error.response?.data || error.message);
        return [];
    }
}

module.exports = { search };