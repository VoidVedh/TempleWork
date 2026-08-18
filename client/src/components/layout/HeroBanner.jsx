import React from 'react';

export default function HeroBanner({
  theme = 'maroon', // 'maroon' | 'green' | 'brown' | 'slate'
  tag,
  title,
  subtitle,
  icon,
  logoSrc = '/assets/ganesha_logo.png',
  actions,
  children
}) {
  return (
    <div className={`hero-card theme-${theme}`}>
      {tag && <div className="hero-top-tag">{tag}</div>}

      <div className="hero-header-row">
        {logoSrc && (
          <div className="hero-logo-box">
            <img src={logoSrc} alt="Logo" className="hero-logo-img" />
          </div>
        )}
        <div className="hero-titles">
          <h1 className="hero-title">{title}</h1>
          {subtitle && <div className="hero-subtitle">{subtitle}</div>}
        </div>
        {actions && <div className="hero-actions">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
