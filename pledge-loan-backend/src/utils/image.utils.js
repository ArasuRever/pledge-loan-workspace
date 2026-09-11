/**
 * Convert binary Buffer to a Data URL (base64) with appropriate MIME type
 */
const bufferToDataUrl = (buffer) => {
  if (!buffer) return null;
  const b64 = buffer.toString('base64');
  const mime = b64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${b64}`;
};

module.exports = {
  bufferToDataUrl
};