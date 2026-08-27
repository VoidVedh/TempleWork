export const MANDAL_CONFIG = {
  mandalNameEn: process.env.MANDAL_NAME_EN || 'Shree Siddhivinayak Mandir',
  mandalNameMr: process.env.MANDAL_NAME_MR || 'श्री सिद्धिविनायक मंदिर',
  locationEn: process.env.MANDAL_LOCATION_EN || 'Unchgaon, Kolhapur (Maharashtra)',
  locationMr: process.env.MANDAL_LOCATION_MR || 'उचगाव, ता. करवीर, जि. कोल्हापूर',
  regNo: process.env.MANDAL_REG_NO || 'MH/08/2024',
  year: parseInt(process.env.MANDAL_YEAR || '2024', 10),
  
  // Official Centralized Mandal UPI Configuration
  upiId: process.env.MANDAL_UPI_ID || 'ganjaleshivam720-1@oksbi',
  payeeName: process.env.MANDAL_PAYEE_NAME || 'Shree Siddhivinayak Mandir',
  payeeNameMr: 'श्री सिद्धिविनायक मंदिर'
};
