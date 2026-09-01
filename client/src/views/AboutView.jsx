import React from 'react';
import { ShieldCheck, Heart, Users, Sparkles, MapPin, Award, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AboutView({ onNavigateToContribute }) {
  const { lang, t } = useLanguage();

  return (
    <div className="section-container animate-fade-in">
      {/* Header Banner */}
      <div className="section-header-banner">
        <div className="section-header-text">
          <div className="section-pretitle">॥ धर्मो रक्षति रक्षितः ॥</div>
          <h1 className="section-title">{t('aboutTitle')}</h1>
          <p className="section-subtitle">{t('aboutSubtitle')}</p>
        </div>
      </div>

      <div className="about-content-grid">
        {/* Main Identity & Trust Details */}
        <div className="about-main-card">
          <div className="about-emblem-row">
            <img src="/assets/ganesha_logo.png" alt="Shree Siddhivinayak" className="about-emblem-img" />
            <div>
              <h2 className="about-card-heading">
                {lang === 'mr' ? 'श्री सिद्धिविनायक मंदिर (एकदंत मित्र मंडळ)' : 'Shree Siddhivinayak Mandir (Ekdant Mitra Mandal)'}
              </h2>
              <div className="about-reg-chip">
                <ShieldCheck size={16} />
                <span>{lang === 'mr' ? 'नोंदणी क्र. महा/०८/२०२४ (महाराष्ट्र शासन धर्मादाय ट्रस्ट)' : 'Reg. No. MH/08/2024 (Govt. of Maharashtra Charity Trust)'}</span>
              </div>
            </div>
          </div>

          <div className="about-narrative-text">
            <p>
              {lang === 'mr' 
                ? 'श्री सिद्धिविनायक मंदिर हे ऐरोली सेक्टर-५ मधील लाखो भाविकांचे श्रद्धास्थान आहे. गेल्या अनेक दशकांपासून अखंड भक्तिभाव, सार्वजनिक गणेशोत्सव, भव्य महाप्रसाद अन्नदान, मोफत आरोग्य शिबिरे, गरजू विद्यार्थ्यांना शैक्षणिक मदत आणि वृक्षारोपण अशा विधायक सामाजिक उपक्रमांचे केंद्र म्हणून मंदिर ट्रस्ट कार्यरत आहे.'
                : 'Shree Siddhivinayak Mandir is a sanctified abode of spiritual solace and divine blessings for countless devotees in Airoli, Navi Mumbai. Established to nurture cultural heritage and social welfare, the trust conducts annual Ganeshotsav celebrations, community Annadaan mahaprasad, medical camps, and educational assistance for underprivileged youth.'}
            </p>
            <p>
              {lang === 'mr'
                ? 'मंदिरामध्ये श्री गणेशाच्या मूर्तीची नित्य वैदिक पूजा, अथर्वशीर्ष अभिषेक, संकष्टी चतुर्थी सोहळा आणि शिवजयंती महोत्सव अत्यंत उत्साहात साजरे केले जातात. पारदर्शकता, प्रामाणिकपणा आणि भाविकांचा विश्वास हे आमच्या ट्रस्टचे मूळ तत्त्व आहे.'
                : 'The Mandir hosts daily Vedic aartis, Sankashti Chaturthi Abhishek, grand festival processions, and Chhatrapati Shivaji Maharaj Jayanti. Transparency, community seva, and spiritual purity remain the cornerstone of our organization.'}
            </p>
          </div>

          {/* Pillars of Seva */}
          <div className="pillars-grid">
            <div className="pillar-item">
              <Sparkles size={24} className="gold-icon" />
              <h4>{lang === 'mr' ? 'नित्य धार्मिक अनुष्ठान' : 'Vedic Rituals'}</h4>
              <p>{lang === 'mr' ? 'दररोज सकाळी व संध्याकाळी सामूहिक महाआरती व अथर्वशीर्ष पठण.' : 'Daily morning and evening Vedic Maha Aarti and recitations.'}</p>
            </div>

            <div className="pillar-item">
              <Heart size={24} className="gold-icon" />
              <h4>{lang === 'mr' ? 'अन्नदान महायज्ञ' : 'Annadaan Mahaprasad'}</h4>
              <p>{lang === 'mr' ? 'सण-उत्सवांमध्ये हजारो भाविकांना मोफत सात्त्विक भोजन वाटप.' : 'Free sacred feast and meals provided to thousands of devotees.'}</p>
            </div>

            <div className="pillar-item">
              <Users size={24} className="gold-icon" />
              <h4>{lang === 'mr' ? 'सामाजिक व शैक्षणिक सेवा' : 'Community Welfare'}</h4>
              <p>{lang === 'mr' ? 'आरोग्य शिबिरे, रक्तदान, आणि गरजू विद्यार्थ्यांसाठी मदत.' : 'Healthcare camps, blood donation, and student scholarships.'}</p>
            </div>
          </div>
        </div>

        {/* Timings & Aarti Schedule Card */}
        <div className="about-side-card">
          <h3 className="side-card-title">{t('timingsLabel')}</h3>
          <div className="timing-row-item">
            <span className="timing-name">{lang === 'mr' ? 'मंदिर खुले राहण्याची वेळ:' : 'Mandir Open:'}</span>
            <span className="timing-val">०६:०० AM - १०:०० PM</span>
          </div>
          <div className="timing-row-item">
            <span className="timing-name">{lang === 'mr' ? 'सकाळची महाआरती:' : 'Morning Aarti:'}</span>
            <span className="timing-val">०७:३० AM</span>
          </div>
          <div className="timing-row-item">
            <span className="timing-name">{lang === 'mr' ? 'दुपारचा नैवेद्य:' : 'Afternoon Bhog:'}</span>
            <span className="timing-val">१२:०० PM</span>
          </div>
          <div className="timing-row-item">
            <span className="timing-name">{lang === 'mr' ? 'संध्याकाळची महाआरती:' : 'Evening Aarti:'}</span>
            <span className="timing-val">०८:०० PM</span>
          </div>
          <div className="timing-row-item">
            <span className="timing-name">{lang === 'mr' ? 'शेजारती व मंदिर बंद:' : 'Shej Aarti:'}</span>
            <span className="timing-val">०९:४५ PM</span>
          </div>

          <div className="trustee-box">
            <h4>{lang === 'mr' ? 'मुख्य पदाधिकारी' : 'Executive Trustees'}</h4>
            <div className="trustee-item">
              <strong>आनंद नाईक</strong> — {lang === 'mr' ? 'मुख्य अध्यक्ष' : 'President'}
            </div>
            <div className="trustee-item">
              <strong>विकास मोरे</strong> — {lang === 'mr' ? 'कार्याध्यक्ष' : 'Working President'}
            </div>
            <div className="trustee-item">
              <strong>सुनील साळुंखे</strong> — {lang === 'mr' ? 'सरचिटणीस' : 'General Secretary'}
            </div>
            <div className="trustee-item">
              <strong>गणेश कदम</strong> — {lang === 'mr' ? 'खजिनदार' : 'Treasurer'}
            </div>
          </div>

          {onNavigateToContribute && (
            <button className="btn-primary btn-block mt-4" onClick={onNavigateToContribute}>
              {lang === 'mr' ? 'मंदिरास देणगी द्या (Contribute)' : 'Contribute to Mandir'} 🙏
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
