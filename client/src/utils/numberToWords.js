const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(num) {
  if (num === 0) return '';
  if (num < 20) return ones[num] + ' ';
  if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10] + ' ';
  return ones[Math.floor(num / 100)] + ' Hundred ' + convertLessThanThousand(num % 100);
}

export function numberToWordsIndian(num) {
  if (!num || isNaN(num)) return 'Rupees Zero Only';
  num = Math.floor(Number(num));
  if (num === 0) return 'Rupees Zero Only';

  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remaining = num;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore).trim() + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh).trim() + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand).trim() + ' Thousand ';
  if (remaining > 0) result += convertLessThanThousand(remaining).trim() + ' ';

  const formattedWithCommas = Number(num).toLocaleString('en-IN');
  return `Rupees ${result.trim()} Only`;
}

export function formatIndianCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0';
  return '₹ ' + Number(amount).toLocaleString('en-IN');
}
