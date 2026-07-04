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
