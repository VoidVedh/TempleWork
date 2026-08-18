export const MANDAL_UPI_CONFIG = {
  upiId: 'ganjaleshivam720-1@oksbi',
  payeeName: 'Ekdant Mitra Mandal Unchgaon',
  payeeNameMr: 'एकदंत मित्र मंडळ, उचगाव',
  mandalLocation: 'उचगाव, ता. करवीर, जि. कोल्हापूर'
};

export function buildUpiDeepLink({ amount, note = 'Ekdant Mandal Vargani' }) {
  const pa = encodeURIComponent(MANDAL_UPI_CONFIG.upiId);
  const pn = encodeURIComponent(MANDAL_UPI_CONFIG.payeeName);
  const tn = encodeURIComponent(note);
  
  if (amount && Number(amount) > 0) {
    const formattedAmount = Number(amount).toFixed(2);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${formattedAmount}&cu=INR&tn=${tn}`;
  }
  return `upi://pay?pa=${pa}&pn=${pn}&cu=INR&tn=${tn}`;
}
