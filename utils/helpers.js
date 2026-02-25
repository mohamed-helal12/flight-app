// ============================================
//  دوال مساعدة
//  تنظيف النتائج وإزالة التكرارات
// ============================================

/**
 * إزالة الرحلات المكررة
 * لو نفس الشركة ونفس الوقت ظهرت من مصدرين، نحتفظ بالأرخص
 */
function removeDuplicates(flights) {
    // نشيل الرحلات بسعر 0
    flights = flights.filter(f => f.price > 0);

    const seen = new Map();

    return flights.filter(flight => {
        // المفتاح: شركة الطيران + وقت المغادرة + من + إلى
        const key = `${flight.airlineCode}-${flight.departTime}-${flight.from}-${flight.to}`;

        if (seen.has(key)) {
            // لو موجودة قبل كده، نقارن الأسعار
            const existing = seen.get(key);
            if (flight.price < existing.price) {
                // الجديدة أرخص، نستبدل
                seen.set(key, flight);
                return true;
            }
            return false; // الموجودة أرخص
        }

        seen.set(key, flight);
        return true;
    });
}

/**
 * تحديد أفضل عرض (أقل سعر)
 */
function markBestDeal(flights) {
    if (flights.length === 0) return flights;

    // نشيل العلامة من الكل
    flights.forEach(f => f.isBestDeal = false);

    // نلاقي الأرخص
    const cheapest = flights.reduce((best, current) =>
        current.price < best.price ? current : best
    );

    // نعلّمه كأفضل عرض
    const index = flights.findIndex(f => f.id === cheapest.id);
    if (index !== -1) {
        flights[index].isBestDeal = true;
    }

    return flights;
}

module.exports = { removeDuplicates, markBestDeal };