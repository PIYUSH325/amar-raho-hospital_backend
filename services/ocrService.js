const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const Tesseract = require('tesseract.js');

exports.extractTextFromFile = async (filePath, mimeType) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    if (mimeType === 'application/pdf') {
      // 1. Digital PDF text layer extraction (using PDFParse class instantiator)
      const fileUint8 = new Uint8Array(fileBuffer);
      const parser = new PDFParse(fileUint8);
      const data = await parser.getText();
      return data.text;
    } else if (mimeType.startsWith('image/')) {
      // 2. Image OCR pixel scanning
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
      return text;
    }
    
    return '';
  } catch (error) {
    console.error('OCR Extraction Failed:', error);
    return 'Scanning failed. Text could not be extracted.';
  }
};