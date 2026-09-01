export const MANDAL_UPI_CONFIG = {
  upiId: '9029359525m@pnb',
  payeeName: 'Shree Siddhivinayak Mandir',
  payeeNameMr: 'श्री सिद्धिविनायक मंदिर',
  mandalLocation: 'ऐरोली सेक्टर-५, नवी मुंबई ४००७०८'
};

export function buildUpiDeepLink({ amount, note = 'Shree Siddhivinayak Mandir Vargani' }) {
  const pa = encodeURIComponent(MANDAL_UPI_CONFIG.upiId);
  const pn = encodeURIComponent(MANDAL_UPI_CONFIG.payeeName);
  const tn = encodeURIComponent(note);
  
  if (amount && Number(amount) > 0) {
    const formattedAmount = Number(amount).toFixed(2);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${formattedAmount}&cu=INR&tn=${tn}`;
  }
  return `upi://pay?pa=${pa}&pn=${pn}&cu=INR&tn=${tn}`;
}
