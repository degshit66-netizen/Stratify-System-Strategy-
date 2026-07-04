import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static files from public directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API Routes
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      url: fileUrl, 
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });
  });

  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
        .filter(file => file !== '.gitkeep')
        .map(file => {
          const filePath = path.join(UPLOADS_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            url: `/uploads/${file}`,
            size: stats.size,
            time: stats.mtime
          };
        });
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.patch("/api/files/:filename", (req, res) => {
    const { filename } = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name required" });

    const oldPath = path.join(UPLOADS_DIR, filename);
    const newPath = path.join(UPLOADS_DIR, newName);

    try {
      if (!fs.existsSync(oldPath)) return res.status(404).json({ error: "File not found" });
      fs.renameSync(oldPath, newPath);
      res.json({ success: true, name: newName, url: `/uploads/${newName}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to rename file" });
    }
  });

  app.delete("/api/files/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);

    try {
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Image data missing" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: image,
                mimeType,
              },
            },
            {
              text: `Analyze this receipt image. Even if it's blurry, try your best to extract:
1. Payor/Company Name (the store or business that issued it)
2. Particulars (a summary of what was purchased)
3. Total Gross Amount (numeric only, e.g. 150.50)
4. Tax Identification Number (TIN) if available
5. Date (if available)

Please return a JSON object exactly matching the schema. Do not include markdown formatting.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              payor: {
                type: Type.STRING,
                description: "Name of the business or store that issued the receipt",
              },
              particulars: {
                type: Type.STRING,
                description: "Brief summary of items purchased",
              },
              gross: {
                type: Type.STRING,
                description: "Total amount on the receipt, digits only, no currency symbol",
              },
              tin: {
                type: Type.STRING,
                description: "Tax Identification Number (TIN) if found",
              },
            },
            required: ["payor", "particulars", "gross", "tin"],
          },
        },
      });

      res.json({ result: response.text });
    } catch (error) {
      console.error("Receipt Scan Error:", error);
      res.status(500).json({ error: "Failed to scan receipt. Please try again." });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, companyName, otp } = req.body;
      if (!email || !companyName || !otp) {
        return res.status(400).json({ error: "Email, company name, and OTP are required" });
      }

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || "STRATIFY System <noreply@stratify.com>";

      if (!host || !user || !pass) {
        console.warn("SMTP email credentials are not fully configured in environment variables.");
        return res.status(400).json({ 
          error: "SMTP_NOT_CONFIGURED",
          message: "SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured. Please add them in the Secrets settings panel of AI Studio so we can send a real email."
        });
      }

      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port || "587", 10),
        secure: port === "465",
        auth: {
          user,
          pass,
        },
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>STRATIFY Security Verification</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f5f7;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .container {
              max-width: 580px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              border: 1px solid #e1e4e8;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
              padding: 32px 24px;
              text-align: center;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.025em;
              text-transform: uppercase;
            }
            .header p {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
              font-weight: 500;
            }
            .content {
              padding: 40px 32px;
              color: #374151;
            }
            .content h2 {
              margin-top: 0;
              font-size: 18px;
              font-weight: 700;
              color: #111827;
            }
            .content p {
              font-size: 15px;
              line-height: 1.6;
              color: #4b5563;
              margin-bottom: 24px;
            }
            .otp-box {
              background-color: #f5f3ff;
              border: 2px dashed #818cf8;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              margin: 32px 0;
            }
            .otp-code {
              font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
              font-size: 36px;
              font-weight: 800;
              color: #4338ca;
              letter-spacing: 0.25em;
              margin: 0;
              padding-left: 0.25em;
            }
            .meta-info {
              background-color: #f8fafc;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
              border: 1px solid #f1f5f9;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: #64748b;
              margin-bottom: 8px;
            }
            .meta-row:last-child {
              margin-bottom: 0;
            }
            .meta-label {
              font-weight: 600;
              color: #475569;
            }
            .footer {
              background-color: #f8fafc;
              padding: 24px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>STRATIFY</h1>
              <p>Security Verification Service</p>
            </div>
            <div class="content">
              <h2>One-Time Password (OTP) Request</h2>
              <p>Hello,</p>
              <p>A password reset request was initiated for your STRATIFY account. Please use the secure, one-time verification code below to authorize this action.</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6366f1; font-weight: 700; text-transform: uppercase;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
              </div>

              <div class="meta-info">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 12px; letter-spacing: 0.05em;">Security Details</div>
                <div class="meta-row">
                  <span class="meta-label">Associated Organization:</span>
                  <span>${companyName}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Target Account:</span>
                  <span>${email}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Validity Period:</span>
                  <span>10 minutes</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
                If you did not request this code, please ignore this email or secure your account. Do not share this OTP with anyone; STRATIFY administrators will never ask for your verification code.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated security transmission from STRATIFY. Please do not reply directly to this message.</p>
              <p>&copy; ${new Date().getFullYear()} STRATIFY Systems Inc. All rights reserved. • Licensed under STRATIFY EULA</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from,
        to: email,
        subject: `[STRATIFY] Security Verification Code: ${otp}`,
        text: `Your STRATIFY One-Time Password (OTP) code is: ${otp}. This code is for resetting your password under the organization ${companyName} for account ${email}.`,
        html: htmlContent,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("OTP Send Error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP email." });
    }
  });

  // AI Financial Copilot Endpoint using GoogleGenAI SDK
  app.post("/api/ai-copilot", async (req, res) => {
    try {
      const { messages, ledgerSummary, companyName } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured in the Secrets panel." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct a detailed system instruction for the CPA Assistant
      const systemInstruction = `You are the Stratify AI Financial Copilot, an elite certified public accountant (CPA) and strategic financial advisor built specifically for the enterprise platform "STRATIFY" (an advanced ERP and Philippine tax accounting system).

Current Organization Context:
- Company Name: ${companyName || "Stratify Enterprise"}
- Local Currency: Philippine Peso (PHP, ₱)

Current Financial State (summarized from General Ledger):
- Total Gross Sales/Revenue: ₱${ledgerSummary?.totalSalesGross || 0} (Net Sales: ₱${ledgerSummary?.totalSalesNet || 0})
- Total Gross Expenses/Purchases: ₱${ledgerSummary?.totalPurchGross || 0} (Net Purchases: ₱${ledgerSummary?.totalPurchNet || 0})
- Total Cost of Sales (COGS): ₱${ledgerSummary?.costOfSales || 0}
- Operating Expenses: ₱${ledgerSummary?.operatingExpenses || 0}
- Gross Profit Margin: ₱${ledgerSummary?.grossProfit || 0}
- Estimated Net Income/Profit: ₱${ledgerSummary?.netIncome || 0}
- Output VAT: ₱${ledgerSummary?.outputVat || 0}
- Input VAT: ₱${ledgerSummary?.inputVat || 0}
- Net VAT Payable/Refundable: ₱${ledgerSummary?.netVat || 0}
- Total Cash Collected/Recorded: ₱${ledgerSummary?.totalCash || 0}
- Number of Active Transactions: ${ledgerSummary?.activeTransactionsCount || 0}

Your capabilities and instructions:
1. Provide extremely accurate financial analysis, expense control suggestions, and growth strategy recommendations.
2. Answer tax-compliance questions specifically tailored to Philippine BIR (Bureau of Internal Revenue) rules, including VAT, Percentage Tax, BIR Form 2307 (withholding tax certificates), and Relief DAT file requirements.
3. Be professional, highly insightful, yet clear and scannable. Use markdown (bold, bullets, tables) to present details elegantly.
4. If asked to perform calculations or projections based on the ledger numbers above, do so with mathematical precision. Always format currency figures with commas and ₱ (e.g., ₱1,250,000.00).
5. Avoid technical jargon when explaining basic concepts, but provide precise BIR section citations or tax rates (e.g., 12% VAT, 1% or 2% EWT under specific ATCs like WI158) for compliance queries.`;

      // Format messages into Content format expected by GoogleGenAI
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      let response;
      let usedFallback = false;

      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (geminiError: any) {
        const errMsg = (geminiError.message || "").toLowerCase();
        if (
          errMsg.includes("quota") || 
          errMsg.includes("exhausted") || 
          errMsg.includes("rate") || 
          errMsg.includes("429") || 
          errMsg.includes("resource_exhausted")
        ) {
          console.warn("Gemini 3.5 Flash quota exceeded or rate limited. Attempting fallback to gemini-3.1-flash-lite...");
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents,
              config: {
                systemInstruction,
                temperature: 0.7,
              },
            });
            usedFallback = true;
          } catch (fallbackError: any) {
            console.error("Fallback to gemini-3.1-flash-lite also failed:", fallbackError);
            throw geminiError; // throw the original error if fallback also fails
          }
        } else {
          throw geminiError;
        }
      }

      let text = response.text || "";
      if (usedFallback) {
        text = "💡 *(Note: We are running in low-resource fallback mode due to high service traffic)*\n\n" + text;
      }

      res.json({ content: text });
    } catch (error: any) {
      console.error("AI Copilot Error:", error);
      
      const rawMsg = error.message || "";
      let friendlyError = "Failed to process request with AI Copilot.";

      if (
        rawMsg.includes("quota") || 
        rawMsg.includes("exhausted") || 
        rawMsg.includes("429") || 
        rawMsg.includes("RESOURCE_EXHAUSTED")
      ) {
        friendlyError = "🔒 **Gemini Free Tier Quota Exceeded (20 requests per day)**\n\nYou have reached the standard Google free tier quota limit for today.\n\n**How to continue:**\n1. Wait a while for the rate limits or daily quota to reset.\n2. Add your own paid/unlimited API Key under the **Settings > Secrets** panel in the workspace to bypass all limits.";
      } else if (rawMsg.includes("API key not valid") || rawMsg.includes("INVALID_ARGUMENT") || rawMsg.includes("key is invalid")) {
        friendlyError = "🔑 **Invalid API Key**\n\nThe Gemini API Key configured in your environment appears to be invalid. Please verify and update your API key in the **Settings > Secrets** panel.";
      } else {
        friendlyError = `⚠️ **AI Service Error**: ${rawMsg}`;
      }

      res.status(500).json({ error: friendlyError });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
