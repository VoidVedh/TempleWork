const MARATHI_DAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDayMarathi(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return 'वार: गुरुवार';
  return `वार: ${MARATHI_DAYS[d.getDay()]}`;
}

export function formatDayEnglish(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return 'Day: Thursday';
  return `Day: ${ENGLISH_DAYS[d.getDay()]}`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}
