import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes
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
