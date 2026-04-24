# AI Audit & Compliance Assistant

An intelligent, AI-powered platform for automated financial auditing and GST compliance verification.

## 🎯 Overview
The AI Audit & Compliance Assistant leverages generative AI and rule-based logic to streamline financial audits. It automatically detects anomalies, validates GST records, and ensures regulatory compliance with high precision, saving hours of manual review.

## 🚀 Key Features
- **Automated GST Validation**: Instant verification of GSTIN, rates, and calculations.
- **Anomaly Detection**: Identifies duplicate invoices, missing data, and calculation mismatches.
- **AI-Powered Insights**: Uses Gemini 2.0 Flash for intelligent document analysis and auditing.
- **Interactive Previews**: Real-time preview of uploaded financial documents (Excel/XLSX).
- **Comprehensive Audit Summaries**: Executive summaries of audit findings and flagged issues.
- **Modern UI/UX**: Built with React 19, Tailwind CSS, and Framer Motion for a premium experience.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, Multer, XLSX
- **AI Integration**: Google Gemini 2.0 Flash API
- **Deployment**: Optimized for Vercel

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-audit-compliance-assistant.git
   cd ai-audit-compliance-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 🚢 Deployment (Vercel)
This project is pre-configured for seamless deployment on Vercel. 

1. Push your code to a GitHub repository.
2. Connect your repository to Vercel.
3. Add `GEMINI_API_KEY` to Vercel Environment Variables.
4. Deploy!

## 📄 License
MIT License - see the [LICENSE](LICENSE) file for details.
