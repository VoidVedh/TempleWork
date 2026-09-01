import React from 'react';
import { Heart, ShieldCheck, MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Footer({ onSelectView, onOpenAdminLogin }) {
  const { lang, t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="footer-top-grid">
        {/* Mandal Branding */}
        <div className="footer-col-brand">
          <div className="footer-brand-title-row">
            <img src="/assets/ganesha_logo.png" alt="Ganesha Logo" className="footer-logo-img" />
            <div>
              <h3 className="footer-brand-heading">{t('mandalName')}</h3>
              <p className="footer-brand-sub">{t('mandalSub')} • एकदंत मित्र मंडळ</p>
            </div>
          </div>
          <p className="footer-mission-text">
            {lang === 'mr' 
              ? 'श्री सिद्धिविनायक मंदिर हे ऐरोलीतील लाखो भाविकांचे श्रद्धास्थान आहे. धार्मिक परंपरा, सार्वजनिक गणेशोत्सव व सामाजिक सेवेचा अखंड वसा.' 
              : 'Shree Siddhivinayak Mandir is a sacred sanctuary of faith, cultural heritage, and community welfare in Airoli, Navi Mumbai.'}
          </p>
          <div className="footer-trust-badge">
            <ShieldCheck size={16} />
            <span>{t('regNo')}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-col-links">
          <h4 className="footer-section-title">{lang === 'mr' ? 'महत्त्वाचे दुवे' : 'Quick Links'}</h4>
          <ul className="footer-links-list">
            <li><button onClick={() => onSelectView('devotee_portal')}>{t('navHome')}</button></li>
            <li><button onClick={() => onSelectView('pay_vargani')}>{t('navContribute')}</button></li>
            <li><button onClick={() => onSelectView('contact')}>{t('navContact')}</button></li>
          </ul>
        </div>

        {/* Aarti & Darshan Timings */}
        <div className="footer-col-timings">
          <h4 className="footer-section-title">{t('timingsLabel')}</h4>
          <div className="footer-timing-item">
            <span>{lang === 'mr' ? 'मंदिर दर्शन:' : 'Darshan:'}</span>
            <strong>०६:०० AM - १०:०० PM</strong>
          </div>
          <div className="footer-timing-item">
            <span>{lang === 'mr' ? 'सकाळची महाआरती:' : 'Morning Aarti:'}</span>
            <strong>०७:३० AM</strong>
          </div>
          <div className="footer-timing-item">
            <span>{lang === 'mr' ? 'संध्याकाळची महाआरती:' : 'Evening Aarti:'}</span>
            <strong>०८:०० PM</strong>
          </div>
          <div className="footer-timing-item">
            <span>{lang === 'mr' ? 'स्थानिक शाखा:' : 'Branch:'}</span>
            <strong>ऐरोली सेक्टर-५</strong>
          </div>
        </div>

        {/* Contact & Admin Entry */}
        <div className="footer-col-contact">
          <h4 className="footer-section-title">{lang === 'mr' ? 'संपर्क व प्रशासन' : 'Contact & Admin'}</h4>
          <p className="footer-contact-line"><MapPin size={15} /> ऐरोली सेक्टर-५, नवी मुंबई ४००७०८</p>
          <p className="footer-contact-line"><Phone size={15} /> +91 8149793310 / +91 9029359525</p>
          <p className="footer-contact-line"><Mail size={15} /> siddhivinayak.mandal.airoli@gmail.com</p>

          <button className="footer-admin-btn" onClick={onOpenAdminLogin}>
            🔒 {t('adminLogin')}
          </button>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <div className="footer-bottom-inner">
          <div>
            © 2026 <strong>{t('mandalName')}</strong>. सर्व हक्क राखीव. (All Rights Reserved)
          </div>
          <div className="footer-blessing-motto">
            ॥ गणपती बाप्पा मोरया • मंगलमूर्ती मोरया ॥
          </div>
        </div>
      </div>
    </footer>
  );
}
