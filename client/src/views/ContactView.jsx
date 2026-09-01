import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ContactView() {
  const { lang, t } = useLanguage();

  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formSubject, setFormSubject] = useState('Abhishek Inquiry');
  const [formMessage, setFormMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitInquiry = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim()) return;

    // Build WhatsApp message for instant response
    const waText = encodeURIComponent(`🚩 *श्री सिद्धिविनायक मंदिर - भाविक चौकशी*\n👤 नाव: ${formName}\n📱 मोबाईल: ${formMobile}\n📌 विषय: ${formSubject}\n💬 संदेश: ${formMessage}`);
    window.open(`https://wa.me/918149793310?text=${waText}`, '_blank');
    setSubmitted(true);
  };

  return (
    <div className="section-container animate-fade-in">
      {/* Header Banner */}
      <div className="section-header-banner">
        <div className="section-header-text">
          <div className="section-pretitle">॥ संपर्क व मार्गदर्शन ॥</div>
          <h1 className="section-title">{t('contactTitle')}</h1>
          <p className="section-subtitle">{t('contactSubtitle')}</p>
        </div>
      </div>

      <div className="contact-layout-grid">
        {/* Contact Info Card */}
        <div className="contact-info-card">
          <h2 className="contact-card-heading">
            {lang === 'mr' ? 'मंदिर कार्यालय व संपर्क माहिती' : 'Mandir Office & Contact'}
          </h2>

          <div className="contact-detail-item">
            <div className="contact-icon-circle"><MapPin size={20} /></div>
            <div>
              <h4>{lang === 'mr' ? 'मंदिराचा पत्ता' : 'Mandir Location'}</h4>
              <p>{t('templeAddress')}</p>
              <a 
                href="https://maps.google.com/?q=Airoli+Sector-5+Navi+Mumbai" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="map-direct-link"
              >
                <span>{lang === 'mr' ? 'Google Maps वर मार्ग पहा' : 'View on Google Maps'}</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="contact-detail-item">
            <div className="contact-icon-circle"><Phone size={20} /></div>
            <div>
              <h4>{t('phoneLabel')}</h4>
              <p>+91 8149793310 / +91 9029359525</p>
              <span className="contact-subtext">{lang === 'mr' ? 'सकाळी १० ते संध्याकाळी ८ पर्यंत' : '10:00 AM - 08:00 PM'}</span>
            </div>
          </div>

          <div className="contact-detail-item">
            <div className="contact-icon-circle"><Mail size={20} /></div>
            <div>
              <h4>{t('emailLabel')}</h4>
              <p>siddhivinayak.mandal.airoli@gmail.com</p>
            </div>
          </div>

          <div className="contact-detail-item">
            <div className="contact-icon-circle"><Clock size={20} /></div>
            <div>
              <h4>{t('timingsLabel')}</h4>
              <p>{t('dailyTimings')}</p>
              <p className="aarti-highlight">{t('aartiTimings')}</p>
            </div>
          </div>
        </div>

        {/* Devotee Inquiry / Abhishek Form */}
        <div className="contact-form-card">
          <h2 className="contact-card-heading">
            {lang === 'mr' ? 'पूजा, अभिषेक किंवा देणगी चौकशी' : 'Puja, Abhishek or Donation Inquiry'}
          </h2>

          {!submitted ? (
            <form onSubmit={handleSubmitInquiry} className="contact-form">
              <div className="form-group">
                <label className="form-label">{lang === 'mr' ? 'आपले पूर्ण नाव' : 'Your Full Name'} *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="उदा. अमित जोशी"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'mr' ? 'मोबाईल नंबर (WhatsApp)' : 'Mobile Number'} *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  className="form-control"
                  placeholder="9820123456"
                  value={formMobile}
                  onChange={e => setFormMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'mr' ? 'चौकशीचा विषय' : 'Inquiry Subject'}</label>
                <select 
                  className="form-control"
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                >
                  <option value="Abhishek & Puja Booking">{lang === 'mr' ? 'अभिषेक व विशेष पूजा बुकिंग' : 'Abhishek & Special Puja'}</option>
                  <option value="Ganeshotsav Vargani">{lang === 'mr' ? 'गणेशोत्सव वर्गणी व देणगी' : 'Ganeshotsav Vargani'}</option>
                  <option value="Annadaan Mahaprasad Seva">{lang === 'mr' ? 'अन्नदान व महाप्रसाद सेवा' : 'Annadaan Seva'}</option>
                  <option value="General Mandir Inquiry">{lang === 'mr' ? 'सामान्य माहिती व मार्गदर्शन' : 'General Inquiry'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'mr' ? 'आपला संदेश किंवा विचारणा' : 'Message or Question'}</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder={lang === 'mr' ? 'आपल्या पूजेची तारीख किंवा संदेश येथे लिहा...' : 'Specify puja date or inquiries here...'}
                  value={formMessage}
                  onChange={e => setFormMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary btn-block">
                <Send size={16} />
                <span>{lang === 'mr' ? 'WhatsApp वर संदेश पाठवा' : 'Send via WhatsApp'}</span>
              </button>
            </form>
          ) : (
            <div className="contact-success-box animate-fade-in">
              <CheckCircle size={48} className="success-icon" />
              <h3>{lang === 'mr' ? 'आपला संदेश पाठवला आहे!' : 'Your message has been sent!'}</h3>
              <p>
                {lang === 'mr' 
                  ? 'मंदिर कार्यालयाकडून लवकरच आपल्याशी संपर्क साधला जाईल.' 
                  : 'The Mandir committee will connect with you shortly.'}
              </p>
              <button className="btn-secondary" onClick={() => setSubmitted(false)}>
                {lang === 'mr' ? 'दुसरा संदेश पाठवा' : 'Send another inquiry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
