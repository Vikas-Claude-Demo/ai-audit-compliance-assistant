import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

// Move health check to top for faster verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});
const PORT = Number(process.env.PORT) || 3000;

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

// Preview endpoint
app.post('/api/preview', upload.single('file'), async (req, res) => {
  console.log('Preview request received', { hasFile: !!req.file, filename: req.file?.originalname });
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return res.status(400).json({ error: 'Sheet is empty or invalid' });
    }

    const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawRows || rawRows.length === 0) {
      return res.json([]);
    }

    const headers = (rawRows[0] || []) as string[];
    const data = rawRows.slice(1, 10).map(row => {
      const obj: any = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i];
      });
      return obj;
    }).filter(r => Object.values(r).some(v => v !== undefined && v !== null));

    console.log('Preview data extracted', { rowCount: data.length });
    res.json(data);
  } catch (error) {
    console.error('Preview Error:', error);
    res.status(500).json({ error: 'Failed to preview file', details: error instanceof Error ? error.message : String(error) });
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
    // Intelligent Header Mapping
    const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = rawRows[0] as string[];
    const sampleRows = rawRows.slice(1, 4);

    const expectedFields = ['Date', 'Invoice Number', 'GSTIN', 'Amount', 'GST Rate', 'GST Amount', 'Vendor'];
    
    let mapping: Record<string, string> = {};
    const hasExactMatch = expectedFields.every(field => headers.includes(field));

    if (!hasExactMatch && process.env.GEMINI_API_KEY) {
      console.log('Headers do not match perfectly, requesting AI mapping...');
      try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const mapPrompt = `Given these headers from a financial spreadsheet: ${JSON.stringify(headers)}
        And these sample rows: ${JSON.stringify(sampleRows)}
        
        Map them to these standard fields: ${JSON.stringify(expectedFields)}
        Return ONLY a JSON object where keys are the standard fields and values are the corresponding headers from the input. 
        If a field is missing, use null.
        Example: {"GSTIN": "Tax Number", "Amount": "Total Value"}`;

        const result = await genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: mapPrompt }] }]
        });
        
        const mapText = result.text.replace(/```json|```/g, '').trim();
        mapping = JSON.parse(mapText);
        console.log('AI Mapping received:', mapping);
      } catch (err) {
        console.error('AI Mapping failed, falling back to positional or exact matching:', err);
      }
    }

    // Process data with mapping
    const data: Transaction[] = rawRows.slice(1).map(row => {
      const obj: any = {};
      expectedFields.forEach((field, idx) => {
        const mappedHeader = mapping[field] || field;
        const headerIdx = headers.indexOf(mappedHeader);
        if (headerIdx !== -1) {
          obj[field] = row[headerIdx];
        } else if (!mapping[field] && idx < row.length) {
          // Fallback to positional if no mapping and it's a standard order
          obj[field] = row[idx];
        }
      });
      return obj as Transaction;
    }).filter(row => row['Invoice Number'] || row.Vendor); // Filter empty rows

    console.log('Audit data processed', { rowCount: data.length });

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

app.post('/api/review', express.json(), async (req, res) => {
  const { issues, summary } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });

    const issueSample = issues.slice(0, 15).map((i: any) => ({
      row: i.rowIndex,
      invoice: i.invoiceNumber,
      type: i.issue,
      details: i.details
    }));

    const prompt = `You are a GST Compliance Expert. Review this audit summary.
    Total Records: ${summary.totalRecords}
    Flagged Issues: ${summary.flaggedCount}
    
    Specific Flagged Samples (Row Index included): ${JSON.stringify(issueSample)}
    
    Provide a strategic summary:
    - Main recurring patterns of failure.
    - Risks (legal and financial).
    - Action plan for the business.
    
    IMPORTANT: In your explanation, ALWAYS refer to specific issues using their Row Index (e.g., "At Row 45, we see...") to provide direct context.
    Keep it very professional, structured with markdown, and concise.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    if (!result || !result.text) {
      console.warn('AI returned empty response or was blocked by safety settings');
      return res.status(500).json({ error: 'AI returned an empty response. This may be due to safety filters.' });
    }

    res.json({ text: result.text });
  } catch (error: any) {
    console.error('Detailed AI Error:', error);
    
    // Friendly handling for Rate Limits (429)
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return res.status(429).json({ 
        error: 'AI Rate Limit Exceeded', 
        details: 'You have reached the free tier limit for Gemini. Please wait about 60 seconds and try again.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate AI insights', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Info handlers for browser visits
app.get(['/api/audit', '/api/preview', '/api/review'], (req, res) => {
  res.send(`This is a ${req.path} endpoint. Please use POST to interact with it via the UI.`);
});

export default app;

// Ensure startServer is only called in local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  startServer();
}

async function startServer() {
  try {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start dev server:', err);
  }
}
