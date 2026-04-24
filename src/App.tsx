import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, AlertCircle, CheckCircle2, FileText, ChevronRight, Activity, 
  Database, AlertTriangle, Shield, Settings, Download, Search, ChevronDown, ChevronUp,
  Cpu, LayoutDashboard, Eye, X, Play, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Types from server
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

interface Summary {
  totalRecords: number;
  flaggedCount: number;
  uniqueIssues: number;
}

const DEMO_CSV = `Date,Invoice Number,GSTIN,Amount,GST Rate,GST Amount,Vendor
2026-04-01,INV001,24ABCDE1234F1Z5,10000,18,1800,ABC Traders
2026-04-01,INV002,24PQRSX5678L1Z2,5000,12,600,XYZ Supplies
2026-04-02,INV003,,8000,18,1440,No GST Vendor
2026-04-02,INV004,24LMNOP2345K1Z9,12000,15,1800,Wrong Rate Pvt Ltd
2026-04-03,INV005,24QWERT9876T1Z1,7000,5,400,Calc Error Ltd
2026-04-03,INV006,24ASDFG4321R1Z7,15000,28,4200,High Tax Corp
2026-04-04,INV007,24ZXCVB6789M1Z3,20000,18,3600,Normal Vendor
2026-04-04,INV008,,3000,5,150,Missing GSTIN Co
2026-04-05,INV009,24HJKLO7654P1Z8,10000,12,1100,Wrong GST Calc
2026-04-05,INV010,24BNMKI5432D1Z4,25000,28,7000,Big Purchase Ltd
2026-04-06,INV011,24TREWA1122C1Z6,6000,18,1080,Good Supplier
2026-04-06,INV012,24YUIPO3344V1Z0,4000,3,120,Invalid Slab Inc
2026-04-07,INV013,24GHJKL5566N1Z1,9500,12,1140,Correct Entry Co
2026-04-07,INV014,24MNBVC7788X1Z2,11000,18,1980,Trusted Vendor
2026-04-08,INV015,,5000,28,1400,Missing GSTIN Two
2026-04-08,INV005,24QWERT9876T1Z1,7000,5,350,Duplicate Invoice Vendor
2026-04-09,INV016,24LKJHG9988S1Z5,10000,18,1700,Wrong Amount GST
2026-04-09,INV017,24POIUY6677A1Z3,13000,12,1560,Regular Supplier
2026-04-10,INV018,24CVBNM5544F1Z7,7500,28,2100,Valid Tax Corp
2026-04-10,INV019,24QAZWS2211E1Z8,9200,8,736,Invalid Rate Test
2026-04-11,INV020,24WSXED3344R1Z1,8200,18,1476,Metro Traders
2026-04-11,INV021,24RFVTG4455T1Z2,6400,12,768,Prime Supply
2026-04-12,INV022,,9000,5,450,No GST Vendor 2
2026-04-12,INV023,24YHNUJ5566Y1Z3,7800,18,1404,Delta Corp
2026-04-13,INV024,24IKOLP6677U1Z4,5600,28,1568,Steel House
2026-04-13,INV025,24PLMKO7788I1Z5,10000,12,1200,Goodline Ltd
2026-04-14,INV026,24ZAQWS8899O1Z6,11500,18,2070,Orbit Vendors
2026-04-14,INV027,24XSWED9900P1Z7,4900,5,245,Fresh Goods
2026-04-15,INV028,24CDEFR1010A1Z8,7200,28,2016,Max Industries
2026-04-15,INV029,24VFRBG1111S1Z9,8100,12,972,Trade Fast
2026-04-16,INV030,24TGNHY1212D1Z1,15000,18,2700,Reliance Source
2026-04-16,INV031,,6200,18,1116,Missing GSTIN Three
2026-04-17,INV032,24UJMIK1313F1Z2,7300,6,438,Invalid Rate Six
2026-04-17,INV033,24OLPZA1414G1Z3,9100,12,1092,Urban Retail
2026-04-18,INV034,24QWERA1515H1Z4,8400,5,420,Daily Needs
2026-04-18,INV035,24ASDFZ1616J1Z5,12300,18,2214,Supply Chain Co
2026-04-19,INV036,24ZXCVX1717K1Z6,9700,28,2716,Infra Build
2026-04-19,INV037,24POILM1818L1Z7,10200,12,1224,Green Parts
2026-04-20,INV038,24LKJHG1919M1Z8,8800,18,1584,North Traders
2026-04-20,INV039,,5400,28,1512,Missing GSTIN Four
2026-04-21,INV040,24MNBVC2020N1Z9,6700,5,335,Easy Shop
2026-04-21,INV041,24QAZXC2121P1Z1,7600,18,1368,Tech Goods
2026-04-22,INV042,24WSXCV2222Q1Z2,9400,12,1128,Office Buy
2026-04-22,INV043,24EDCRF2323R1Z3,5100,28,1428,Power Tools
2026-04-23,INV044,24RFVTG2424S1Z4,8300,18,1494,Global Trade
2026-04-23,INV045,24TGBYH2525T1Z5,6100,12,700,Wrong Calc Vendor
2026-04-24,INV046,24YHNUJ2626U1Z6,7100,5,355,Local Mart
2026-04-24,INV047,,8900,18,1602,Missing GSTIN Five
2026-04-25,INV048,24UJMKI2727V1Z7,11100,28,3108,Heavy Equip
2026-04-25,INV049,24IKOLP2828W1Z8,9300,12,1116,Smart Supply
2026-04-26,INV050,24PLMKO2929X1Z9,4700,18,846,Quick Trade
2026-04-26,INV051,24ZAQWS3030Y1Z1,6900,10,690,Invalid Rate Ten
2026-04-27,INV052,24XSWED3131Z1Z2,8500,5,425,Vendor Plus
2026-04-27,INV053,24CDEFR3232A1Z3,9800,18,1764,Industrial Hub
2026-04-28,INV054,24VFRBG3333B1Z4,7600,12,912,Retail Desk
2026-04-28,INV055,24TGNHY3434C1Z5,10400,28,2912,Final Entry Ltd`;



export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ flaggedIssues: FlaggedIssue[]; summary: Summary } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [selectedIssueForDetail, setSelectedIssueForDetail] = useState<FlaggedIssue | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'rowIndex' | 'issue', direction: 'asc' | 'desc' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Focus the file input hidden ref as requested
    fileInputRef.current?.focus();

    // Check server health
    fetch('/api/health')
      .then(r => r.json())
      .then(d => console.log('Server health:', d))
      .catch(e => console.error('Server health check failed:', e));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setPreviewData(null);
    }
  };

  const useDemoData = () => {
    const blob = new Blob([DEMO_CSV], { type: 'text/csv' });
    const demoFile = new File([blob], 'demo_transactions.csv', { type: 'text/csv' });
    setFile(demoFile);
    setError(null);
    setPreviewData(null);
    setTimeout(() => fetchPreviewForFile(demoFile), 100);
  };

  const fetchPreviewForFile = async (targetFile: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', targetFile);
    try {
      const resp = await fetch('/api/preview', { method: 'POST', body: formData });
      if (resp.ok) {
        const data = await resp.json();
        setPreviewData(data);
        setShowPreviewModal(true);
      } else {
        throw new Error('Preview failed');
      }
    } catch (err) {
      setError('Could not generate preview.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = () => {
    if (file) fetchPreviewForFile(file);
  };

  const runAudit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setAiInsight(null);
    setSelectedIssueForDetail(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Audit failed');

      const data = await response.json();
      setResults(data);
      if (data.flaggedIssues.length > 0) {
        setSelectedIssueForDetail(data.flaggedIssues[0]);
        generateAIReview(data.flaggedIssues, data.summary);
      } else {
        setAiInsight("All transactions are compliant with the specified GST rules.");
      }
    } catch (err) {
      setError('Audit failed. Ensure your file matches the required headers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateAIReview = async (issues: FlaggedIssue[], summary: Summary) => {
    try {
      const resp = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues, summary })
      });

      if (!resp.ok) throw new Error('AI review failed');
      
      const data = await resp.json();
      setAiInsight(data.text || 'Unable to generate AI insights.');
    } catch (err) {
      console.error('AI Error:', err);
      setAiInsight('Audit successful, AI summary failed.');
    }
  };

  const exportToCSV = () => {
    if (!results) return;

    const headers = ['Row', 'Invoice Number', 'Issue', 'Details', 'Vendor', 'Amount', 'GST Rate', 'GST Amount'];
    const rows = results.flaggedIssues.map(i => [
      i.rowIndex,
      `"${i.invoiceNumber}"`,
      `"${i.issue}"`,
      `"${i.details}"`,
      `"${i.data.Vendor || 'N/A'}"`,
      i.data.Amount || 0,
      i.data['GST Rate'] || 0,
      i.data['GST Amount'] || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedIssues = useMemo(() => {
    if (!results) return [];
    let items = [...results.flaggedIssues];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [results, sortConfig]);

  const requestSort = (key: 'rowIndex' | 'issue') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">AuditSense <span className="text-blue-600">AI</span></h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">GST Compliance Assistant • v2.4</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">AuditSense Engine Online</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-6 grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col space-y-6">
          
          {/* Upload Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                Data Input
              </h3>
              <button 
                onClick={useDemoData}
                disabled={loading}
                className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors uppercase flex items-center gap-1 shadow-sm"
              >
                <Play size={10} /> Try Demo Sheet
              </button>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                ${file ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .csv" 
                className="hidden" 
              />
              <Upload className={`w-10 h-10 mb-3 ${file ? 'text-blue-500' : 'text-slate-300'}`} />
              {file ? (
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-600 truncate max-w-[200px] mb-1">{file.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB detected</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500">Drop transaction file</p>
                  <p className="text-[10px] text-slate-400 mt-1">CSV or XLSX supported</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchPreview}
                disabled={!file || loading}
                className={`flex-1 mt-4 flex items-center justify-center gap-2 font-bold py-3 rounded-lg text-sm transition-all border
                  ${!file || loading ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed shadow-none' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
              >
                <Eye size={14} /> Preview
              </button>
              <button 
                onClick={runAudit}
                disabled={!file || loading}
                className={`flex-[2] mt-4 flex items-center justify-center gap-2 font-bold py-2 px-3 rounded-lg text-sm transition-all shadow-lg
                  ${!file || loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Activity size={14} className="animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <>Run AI Audit</>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-red-100 text-red-700 text-[10px] font-bold rounded-lg flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Verification Protocols</h3>
            <div className="space-y-4">
              {[
                { title: 'Tax Identity', desc: 'Auto-scans for missing/invalid GSTINs.' },
                { title: 'Arithmetic', desc: 'Validates Amount × Rate accuracy.' },
                { title: 'Redundancy', desc: 'Detects duplicate invoice sequences.' }
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col space-y-6 overflow-hidden">
          
          {/* Summary Stats */}
          <AnimatePresence>
            {results && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-blue-500">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Scanned</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{results.summary.totalRecords}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-rose-500">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Flags Raised</p>
                  <p className="text-2xl font-bold text-rose-500 mt-1">{results.summary.flaggedCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-green-500">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compliance</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {Math.max(0, Math.round(100 - (results.summary.flaggedCount / (results.summary.totalRecords || 1) * 100)))}%
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Insights Analysis */}
          <div className={`bg-slate-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden transition-all duration-500 ${!results ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            {loading && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-blue-400 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-blue-300 rounded-full" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 animate-pulse">Running Neural Compliance Scan</span>
              </div>
            )}
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-5 rounded-full"></div>
            <h3 className="text-xs font-bold mb-4 flex items-center tracking-widest uppercase opacity-80 border-b border-white/10 pb-2">
              AuditSense Insights Analysis
            </h3>
            <div className="text-sm leading-relaxed font-sans min-h-[120px]">
              {aiInsight ? (
                <div className="markdown-content text-slate-200">
                  <ReactMarkdown 
                    components={{
                      h1: (props) => <h1 className="text-lg font-bold text-blue-400 mt-4 mb-2 uppercase tracking-tight" {...props} />,
                      h2: (props) => <h2 className="text-md font-bold text-blue-300 mt-3 mb-2 underline underline-offset-4" {...props} />,
                      h3: (props) => <h3 className="text-sm font-bold text-blue-200 mt-2 mb-1" {...props} />,
                      p: (props) => <p className="mb-2 opacity-90 leading-relaxed font-medium" {...props} />,
                      ul: (props) => <ul className="list-disc pl-4 mb-3 space-y-1 opacity-80" {...props} />,
                      li: (props) => <li className="text-[11px]" {...props} />,
                      strong: (props) => <strong className="text-blue-100 font-bold" {...props} />,
                    }}
                  >
                    {aiInsight}
                  </ReactMarkdown>
                </div>
              ) : results ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="animate-pulse tracking-wide font-medium">Synthesizing compliance risks...</span>
                </div>
              ) : (
                <p className="italic text-slate-500 py-4 font-medium opacity-60">Awaiting data input to generate systemic compliance analysis.</p>
              )}
            </div>
            {results && (
              <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                <span className="opacity-40 flex items-center gap-1 group">
                  <Activity size={10} className="group-hover:text-blue-400 transition-colors" /> Intelligence Engine v1.5
                </span>
                <button 
                  onClick={exportToCSV}
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-4 flex items-center gap-1 transition-colors"
                >
                  <Download size={10} /> Export Audit Report
                </button>
              </div>
            )}
          </div>

          {/* Flagged Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-xl z-20 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 text-slate-700">
                <LayoutDashboard size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Flagged Transactions</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100 uppercase tracking-tighter">
                  {results ? `${results.summary.flaggedCount} Problems Found` : 'No Data Session'}
                </span>
              </div>
            </div>

            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-[0_1px_rgba(0,0,0,0.05)]">
                  <tr>
                    <th 
                      className="px-5 py-3 tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => requestSort('rowIndex')}
                    >
                      <div className="flex items-center gap-1">
                        Row No. <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" />
                      </div>
                    </th>
                    <th className="px-5 py-3 tracking-widest">Invoice Unit</th>
                    <th className="px-5 py-3 tracking-widest">Merchant/Vendor</th>
                    <th 
                      className="px-5 py-3 tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => requestSort('issue')}
                    >
                      <div className="flex items-center gap-1">
                        Risk Profile <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" />
                      </div>
                    </th>
                    <th className="px-5 py-3 text-center tracking-widest">Detail View</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 font-medium text-slate-600">
                  {results && sortedIssues.length > 0 ? (
                    sortedIssues.map((issue, idx) => {
                      const isDuplicate = issue.issue.includes('Duplicate');
                      return (
                        <React.Fragment key={`${issue.invoiceNumber}-${issue.rowIndex}-${idx}`}>
                          <tr 
                            onClick={() => {
                              setExpandedIssue(expandedIssue === idx ? null : idx);
                              setSelectedIssueForDetail(issue);
                            }}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer group 
                              ${expandedIssue === idx ? 'bg-blue-50/30' : ''} 
                              ${isDuplicate ? 'bg-orange-50/40 border-l-2 border-l-orange-400' : ''}`}
                          >
                            <td className="px-5 py-4 font-mono text-[10px] text-slate-400">#{issue.rowIndex}</td>
                            <td className={`px-5 py-4 font-mono text-[11px] font-bold ${isDuplicate ? 'text-orange-700 underline underline-offset-2 decoration-orange-300' : 'text-slate-900'}`}>
                              {issue.invoiceNumber}
                            </td>
                            <td className="px-5 py-4 max-w-[150px] truncate text-slate-500 uppercase text-[10px] font-bold">{issue.data.Vendor || 'N/A'}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight
                                ${issue.issue.includes('Calculation') ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                                  issue.issue.includes('GSTIN') ? 'bg-slate-100 text-slate-600 border border-slate-200' : 
                                  issue.issue.includes('Duplicate') ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                  'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                                {issue.issue}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`p-1.5 rounded-full transition-all inline-block ${expandedIssue === idx ? 'bg-white shadow-sm rotate-180' : 'text-blue-500 hover:bg-white'}`}>
                                <ChevronDown size={14} />
                              </span>
                            </td>
                          </tr>
                          {expandedIssue === idx && (
                            <motion.tr 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-blue-50/5"
                            >
                              <td colSpan={5} className="px-5 py-4 border-l-4 border-l-blue-400">
                                <div className="flex flex-col md:flex-row gap-8 bg-white/80 p-5 rounded-xl border border-blue-100 shadow-sm backdrop-blur-sm">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-1">
                                      <AlertTriangle size={10} className="text-rose-500" /> Error Breakdown Unit ({issue.rowIndex})
                                    </p>
                                    <p className="text-xs text-slate-700 italic leading-relaxed max-w-sm">"{issue.details}"</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-l border-slate-100 pl-8">
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Applied Rate</p>
                                      <p className="text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">{issue.data['GST Rate']}%</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Reported Tax</p>
                                      <p className="text-xs font-bold text-slate-800">₹{issue.data['GST Amount']}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Batch Row</p>
                                      <p className="text-xs font-bold text-slate-800">{issue.rowIndex}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-24 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <Database size={48} className="mb-4 text-slate-300" />
                          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Initialize Data Session</p>
                          <p className="text-[10px] mt-1 text-slate-400 italic">No transactions detected for analysis</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedIssueForDetail && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden group"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cpu size={120} />
              </div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-4 text-white shadow-lg shadow-blue-100">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Actionable Diagnosis</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Target: INV-{selectedIssueForDetail.invoiceNumber}</p>
                  </div>
                </div>
                <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">NODE REF • {selectedIssueForDetail.rowIndex}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all hover:bg-white hover:shadow-md">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Critical Variant</p>
                  <p className="text-sm font-bold text-rose-600">Violation Found</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all hover:bg-white hover:shadow-md">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Issue Class</p>
                  <p className="text-sm font-bold text-slate-800 uppercase tracking-tighter truncate">{selectedIssueForDetail.issue}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 col-span-2 transition-all hover:bg-white hover:shadow-md border-l-4 border-l-blue-400">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Compliance Directive</p>
                  <p className="text-xs text-slate-600 font-bold italic truncate">"Verify ITC Eligibility & Recon"</p>
                </div>
              </div>

              <p className="text-xs leading-loose text-slate-600 font-medium max-w-3xl bg-white/50 relative z-10 px-1">
                Detected a <span className="text-rose-600 font-bold underline decoration-rose-200 underline-offset-4">{selectedIssueForDetail.issue}</span> at batch coordinate <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">R-{selectedIssueForDetail.rowIndex}</span>. 
                Our simulation indicates that {selectedIssueForDetail.details.toLowerCase()} 
                Immediate corrective verification is recommended to preserve input tax integrity.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Status Footer Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <div className="flex space-x-8">
          <span className="opacity-60 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
            Core ID: <span className="text-slate-900 font-mono">AS-9921-XPR</span>
          </span>
          <span className="opacity-60 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
            Ledger Date: <span className="text-slate-900 border-b border-slate-200">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          </span>
        </div>
        <div className="flex space-x-6 items-center">
          <span className="flex items-center group cursor-help text-blue-600">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Real-time Mesh Active
          </span>
          <span className="text-slate-200">|</span>
          <div className="flex gap-6">
            <span className="hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-1" onClick={exportToCSV}><Download size={10} /> CSV</span>
            <span className="opacity-30 flex items-center gap-1 cursor-not-allowed"><Download size={10} /> XLSX</span>
          </div>
        </div>
      </footer>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Interactive Ledger Preview</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">Validation Stage • Verify Fields</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-auto p-2 bg-slate-50/30">
                <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50/80 sticky top-0 border-b border-slate-100 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4 border-r border-slate-100/50">#</th>
                      {Object.keys(previewData[0] || {}).map((key, i) => (
                        <th key={key} className="px-6 py-4 border-r border-slate-100/50">{key}</th>
                      ))}
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-slate-50">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="px-6 py-4 text-[10px] text-slate-300 font-mono border-r border-slate-100/30">0{idx + 1}</td>
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className={`px-6 py-4 text-[11px] font-medium border-r border-slate-100/30 group-last:border-r-0 ${i === 1 ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-200 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg"><Search size={14} className="text-slate-500" /></div>
                  <p className="text-[10px] text-slate-500 font-bold italic tracking-wide">Analysis simulation locked on top 5 batch records</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowPreviewModal(false)}
                    className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all uppercase tracking-widest border-2 border-transparent hover:border-slate-200 rounded-2xl"
                  >
                    Hold Session
                  </button>
                  <button 
                    onClick={() => {
                      setShowPreviewModal(false);
                      runAudit();
                    }}
                    className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-widest flex items-center gap-2"
                  >
                    <Activity size={14} /> Commit Full Audit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
