/**
 * WhatsApp Share & Donation Acknowledgement Helper
 */

export function buildDonationShareText(receipt, lang = 'mr') {
  const templeName = 'श्री सिद्धिविनायक मंदिर (Reg. No. MH/08/2026)';
  const receiptNo = receipt.receipt_no || 'EMM-XXXX';
  const amount = receipt.amount || 0;
  const donorName = receipt.donor_name || 'गणेश भक्त';
  const date = receipt.issue_date ? receipt.issue_date.split(' ')[0] : new Date().toLocaleDateString('en-IN');

  if (lang === 'en') {
    return [
      `🚩 *${templeName}* 🚩`,
      `Airoli Sector-5, Navi Mumbai`,
      ``,
      `🙏 *Donation & Seva Receipt*`,
      `• *Receipt No:* ${receiptNo}`,
      `• *Donor Name:* ${donorName}`,
      `• *Amount:* ₹${amount}`,
      `• *Date:* ${date}`,
      `• *Status:* Verified & Received (जमा)`,
      ``,
      `May Lord Ganesha bestow good health, prosperity, and joy upon you and your family! 🌺`,
      `_Ganpati Bappa Morya!_`
    ].join('\n');
  }

  if (lang === 'hi') {
    return [
      `🚩 *${templeName}* 🚩`,
      `ऐरोली सेक्टर-५, नवी मुंबई`,
      ``,
      `🙏 *दान एवं सेवा पावती*`,
      `• *पावती क्र:* ${receiptNo}`,
      `• *दाता का नाम:* ${donorName}`,
      `• *रक्कम:* ₹${amount}`,
      `• *दिनांक:* ${date}`,
      `• *स्थिति:* सत्यापित एवं प्राप्त (Paid)`,
      ``,
      `भगवान श्री सिद्धिविनायक आप पर एवं आपके परिवार पर सदैव कृपा दृष्टि बनाए रखें! 🌺`,
      `_गणपती बाप्पा मोरया!_`
    ].join('\n');
  }

  // Default: Marathi
  return [
    `🚩 *${templeName}* 🚩`,
    `ऐरोली सेक्टर-५, नवी मुंबई`,
    ``,
    `🙏 *देणगी / वर्गणी अधिकृत पावती*`,
    `• *पावती क्र:* ${receiptNo}`,
    `• *दाता:* ${donorName}`,
    `• *रक्कम:* ₹${amount}/-`,
    `• *दिनांक:* ${date}`,
    `• *स्थिती:* जमा (Verified & Paid)`,
    ``,
    `श्री सिद्धिविनायकाच्या कृपेने आपल्या सर्व मनोकामना पूर्ण होवोत हीच प्रार्थना! 🌺`,
    `_|| गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ||_`
  ].join('\n');
}

export function openWhatsAppShare(receipt, lang = 'mr') {
  const text = buildDonationShareText(receipt, lang);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}
