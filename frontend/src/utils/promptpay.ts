import QRCode from 'qrcode';

/**
 * Calculates CRC16-CCITT (0xFFFF initial, 0x1021 poly) for EMVCo QR code string
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates official EMVCo PromptPay QR payload string compatible with all Thai banking apps.
 *
 * @param promptPayId Mobile number (10 digits) or Citizen / Tax ID (13 digits)
 * @param amount Optional bill amount in THB
 */
export function generatePromptPayPayload(promptPayId: string, amount?: number): string {
  const sanitized = promptPayId.replace(/[^0-9]/g, '');
  if (!sanitized) return '';

  let subTag = '';
  if (sanitized.length === 10 && sanitized.startsWith('0')) {
    // Thai Mobile: 0812345678 -> 0066812345678
    const formatted = '0066' + sanitized.substring(1);
    subTag = formatTag('01', formatted);
  } else if (sanitized.length === 9) {
    // Mobile without leading 0
    subTag = formatTag('01', '0066' + sanitized);
  } else if (sanitized.length === 13) {
    // National ID or Tax ID
    subTag = formatTag('02', sanitized);
  } else if (sanitized.length === 15) {
    // e-Wallet ID
    subTag = formatTag('03', sanitized);
  } else {
    // Fallback: mobile format
    subTag = formatTag('01', sanitized.startsWith('0') ? '0066' + sanitized.substring(1) : sanitized);
  }

  const tag29Value = formatTag('00', 'A000000677010111') + subTag;

  const hasAmount = typeof amount === 'number' && amount > 0;
  let payload =
    formatTag('00', '01') +
    formatTag('01', hasAmount ? '12' : '11') +
    formatTag('29', tag29Value) +
    formatTag('53', '764'); // THB currency code

  if (hasAmount) {
    payload += formatTag('54', amount.toFixed(2));
  }

  payload += formatTag('58', 'TH');
  payload += '6304';

  const checksum = crc16(payload);
  return payload + checksum;
}

/**
 * Formats a PromptPay ID for user-friendly reading (e.g. 081-234-5678 or 1-2345-67890-12-3)
 */
export function formatPromptPayDisplay(id?: string | null): string {
  if (!id) return '';
  const clean = id.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6)}`;
  }
  if (clean.length === 13) {
    return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}-${clean.substring(12)}`;
  }
  return id;
}

/**
 * Generates a high-quality data URL (PNG) of PromptPay QR code
 */
export async function generatePromptPayQrDataUrl(
  promptPayId: string,
  amount?: number,
  size = 280,
): Promise<string> {
  const payload = generatePromptPayPayload(promptPayId, amount);
  if (!payload) throw new Error('หมายเลขพร้อมเพย์ไม่ถูกต้อง');

  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#00264d', // Deep blue PromptPay signature tone
      light: '#ffffff',
    },
  });
}
