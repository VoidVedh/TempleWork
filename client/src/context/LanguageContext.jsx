import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('ekdant_lang') || 'mr';
    } catch {
      return 'mr';
    }
  });

  const changeLanguage = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem('ekdant_lang', newLang);
    } catch {}
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['mr']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
