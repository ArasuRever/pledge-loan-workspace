/**
 * Generates a unique barcode using the metal type, item name, and a timestamp.
 */
const generateBarcode = (itemName, metalType) => {
  const metalCode = metalType.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const itemCode = itemName.replace(/\s+/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  const timestampCode = Date.now().toString().slice(-6);
  
  return `${metalCode}-${itemCode}-${timestampCode}`;
};

module.exports = {
  generateBarcode
};