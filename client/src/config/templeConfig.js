/**
 * Temple Configuration & Sacred Timings
 * Single Source of Truth for Temple Information
 */

export const TEMPLE_ARTI_TIMINGS = {
  morning: '8:00 AM',
  evening: '8:00 PM',
  morning_mr: '०८:०० AM',
  evening_mr: '०८:०० PM',
  morning_hi: '०८:०० AM',
  evening_hi: '०८:०० PM',
  darshan_hours: '6:00 AM – 10:00 PM',
  darshan_hours_mr: '०६:०० AM – १०:०० PM'
};

export const MANDAL_IDENTITY = {
  name_mr: 'श्री सिद्धिविनायक मंदिर',
  name_en: 'Shree Siddhivinayak Mandir',
  name_hi: 'श्री सिद्धिविनायक मंदिर',
  location_mr: 'ऐरोली सेक्टर-५, नवी मुंबई ४००७०८ (महाराष्ट्र)',
  location_en: 'Airoli Sector-5, Navi Mumbai 400708 (Maharashtra)',
  reg_no: 'MH/08/2026'
};

export const TEMPLE_DAILY_SCHEDULE = [
  { time: '06:00 AM', name_mr: 'मंदिर उघडणे व मंगल दर्शन', name_en: 'Temple Opens & Mangal Darshan', name_hi: 'मंदिर उद्घाटन एवं मंगल दर्शन' },
  { time: '08:00 AM', name_mr: 'सकाळची महाआरती', name_en: 'Morning Maha Aarti', name_hi: 'प्रातः महाआरती' },
  { time: '12:30 PM', name_mr: 'महाप्रसाद व नैवेद्य समर्पण', name_en: 'Mahaprasad & Naivedya Offering', name_hi: 'महाप्रसाद एवं नैवेद्य समर्पण' },
  { time: '08:00 PM', name_mr: 'संध्याकाळची महाआरती', name_en: 'Evening Maha Aarti', name_hi: 'संध्या महाआरती' },
  { time: '10:00 PM', name_mr: 'शेजारती व मंदिर विश्राम', name_en: 'Shej Aarti & Temple Rest', name_hi: 'शेजारती एवं मंदिर विश्राम' }
];

export function getDailyScheduleByLanguage(lang = 'mr') {
  return TEMPLE_DAILY_SCHEDULE.map(item => ({
    time: item.time,
    title: lang === 'en' ? item.name_en : (lang === 'hi' ? item.name_hi : item.name_mr)
  }));
}

export const TEMPLE_CONTACT = {
  phoneDisplay: '+91 84540 09809',
  phonePrimary: '+91 84540 09809',
  phoneSecondary: '+91 84540 09809',
  email: 'contact@shreesiddhivinayak.org',
  whatsappNumber: '918454009809',
  receiptWhatsAppNumber: '918454009809'
};

