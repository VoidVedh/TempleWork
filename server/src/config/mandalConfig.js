export const MANDAL_CONFIG = {
  mandalNameEn: process.env.MANDAL_NAME_EN || 'Ekdant Mitra Mandal Unchgaon',
  mandalNameMr: process.env.MANDAL_NAME_MR || 'एकदंत मित्र मंडळ, उचगाव',
  locationEn: process.env.MANDAL_LOCATION_EN || 'Unchgaon, Kolhapur (Maharashtra)',
  locationMr: process.env.MANDAL_LOCATION_MR || 'उचगाव, ता. करवीर, जि. कोल्हापूर',
  regNo: process.env.MANDAL_REG_NO || 'MH/08/2024',
  year: parseInt(process.env.MANDAL_YEAR || '2024', 10),
  
  // Official Centralized Mandal UPI Configuration
  upiId: process.env.MANDAL_UPI_ID || 'ganjaleshivam720-1@oksbi',
  payeeName: process.env.MANDAL_PAYEE_NAME || 'Ekdant Mitra Mandal',
  payeeNameMr: 'एकदंत मित्र मंडळ'
};
