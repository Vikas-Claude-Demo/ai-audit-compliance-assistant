import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import * as xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GST Validation Rules
const VALID_RATES = [5, 12, 18, 28];

interface Transaction {
  Date?: string | number;
  'Invoice Number'?: string;
  GSTIN?: string;
  Amount?: number;
  'GST Rate'?: number;
  'GST Amount'?: number;
  Vendor?: string;
}

interface FlaggedIssue {
  rowIndex: number;
  invoiceNumber: string;
  issue: string;
  details: string;
  data: Transaction;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/preview', upload.single('file'), async (req, res) => {
  console.log('Preview request received', { hasFile: !!req.file, filename: req.file?.originalname });
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: Transaction[] = xlsx.utils.sheet_to_json(worksheet, { header: 0, range: 0 });

    console.log('Preview data extracted', { rowCount: data.length });
    // Return the first 5 rows for preview
    res.json(data.slice(0, 5));
  } catch (error) {
    console.error('Preview Error:', error);
    res.status(500).json({ error: 'Failed to preview file' });
  }
});

app.post('/api/audit', upload.single('file'), async (req, res) => {
  console.log('Audit request received', { hasFile: !!req.file, filename: req.file?.originalname });
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: Transaction[] = xlsx.utils.sheet_to_json(worksheet);

    console.log('Audit data extracted', { rowCount: data.length });

    const flaggedIssues: FlaggedIssue[] = [];
    const invoiceNumbers = new Set<string>();
    const duplicateInvoices = new Set<string>();

    // Initial pass to find duplicates
    data.forEach((row) => {
      const invNum = String(row['Invoice Number'] || '').trim();
      if (invNum) {
        if (invoiceNumbers.has(invNum)) {
          duplicateInvoices.add(invNum);
        }
        invoiceNumbers.add(invNum);
      }
    });

    data.forEach((row, index) => {
      const rowIndex = index + 2; // Assuming header is row 1
      const invNum = String(row['Invoice Number'] || 'N/A');
      
      // 1. Missing GSTIN
      if (!row.GSTIN || String(row.GSTIN).trim() === '') {
        flaggedIssues.push({
          rowIndex,
          invoiceNumber: invNum,
          issue: 'Missing GSTIN',
          details: 'The GST identification number is missing for this transaction.',
          data: row
        });
      }

      // 2. Invalid GST Rate
      const rateLabel = 'GST Rate';
      const rate = typeof row['GST Rate'] === 'number' ? row['GST Rate'] : parseFloat(String(row['GST Rate'] || '0'));
      if (!VALID_RATES.includes(rate)) {
        flaggedIssues.push({
          rowIndex,
          invoiceNumber: invNum,
          issue: 'Invalid GST Rate',
          details: `The GST rate ${rate}% is not among the standard rates (5, 12, 18, 28).`,
          data: row
        });
      }

      // 3. Incorrect GST Calculation
      const amount = row.Amount || 0;
      const gstAmount = row['GST Amount'] || 0;
      const expectedGst = (amount * rate) / 100;
      // Precision check (allowing 1 unit difference)
      if (Math.abs(expectedGst - gstAmount) > 1) {
        flaggedIssues.push({
          rowIndex,
          invoiceNumber: invNum,
          issue: 'Calculation Mismatch',
          details: `Expected GST Amount: ${expectedGst.toFixed(2)}, but found: ${gstAmount.toFixed(2)}.`,
          data: row
        });
      }

      // 4. Duplicate Invoice
      if (duplicateInvoices.has(invNum)) {
        flaggedIssues.push({
          rowIndex,
          invoiceNumber: invNum,
          issue: 'Duplicate Invoice',
          details: `The invoice number ${invNum} appears multiple times in the dataset.`,
          data: row
        });
      }
    });

    const summary = {
      totalRecords: data.length,
      flaggedCount: flaggedIssues.length,
      uniqueIssues: Array.from(new Set(flaggedIssues.map(f => f.issue))).length
    };

    res.json({ flaggedIssues, summary });
  } catch (error) {
    console.error('Audit Error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// ... (previous imports and logic)

export default app;

if (process.env.NODE_ENV !== 'production') {
  startServer();
}

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
