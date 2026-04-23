// A lightweight helper to generate a receipt URL for completed transactions.
// Replace this with a real PDF generation + storage workflow as needed.

const generateReceiptUrl = async (transaction) => {
  // TODO: Integrate a real PDF generator (pdfkit, puppeteer, or cloud function)
  // and upload the generated document to S3 / Firebase Storage / another file store.
  return `https://lishe-pamoja.example.com/receipts/${transaction._id}.pdf`;
};

module.exports = { generateReceiptUrl };
