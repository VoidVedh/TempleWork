/**
 * Calendar Utilities for generating .ics files and Google Calendar URLs
 */

export function generateGoogleCalendarUrl(event) {
  if (!event || !event.date) return '#';

  const title = encodeURIComponent(event.title_mr || event.title_en || 'Shree Siddhivinayak Mandir Event');
  const details = encodeURIComponent(event.description_mr || event.description_en || '');
  const location = encodeURIComponent(`${event.venue_mr || event.venue_en}, Airoli, Navi Mumbai`);

  // Parse date YYYY-MM-DD
  const dateParts = event.date.split('-');
  if (dateParts.length !== 3) return '#';

  const dateStr = dateParts.join('');
  // 09:00:00 to 12:00:00 default UTC
  const startIso = `${dateStr}T040000Z`;
  const endIso = `${dateStr}T080000Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

export function downloadIcsFile(event) {
  if (!event || !event.date) return;

  const title = (event.title_en || event.title_mr || 'Mandir Event').replace(/,/g, '\\,');
  const description = (event.description_en || event.description_mr || '').replace(/\n/g, '\\n');
  const location = (event.venue_en || event.venue_mr || 'Shree Siddhivinayak Mandir, Airoli').replace(/,/g, '\\,');

  const dateStr = event.date.replace(/-/g, '');
  const startIso = `${dateStr}T090000`;
  const endIso = `${dateStr}T130000`;
  const uid = `event-${event.id || Date.now()}@siddhivinayak-mandir.org`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shree Siddhivinayak Mandir Trust//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dateStr}T000000Z`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.slug || 'event'}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
