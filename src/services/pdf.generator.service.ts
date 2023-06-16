import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { IPDFResponse } from "../interfaces/common.interface";
import puppeteer, { PaperFormat } from "puppeteer";
import * as fs from "fs";

@Injectable()
export class PDFService {
  private readonly pdfFilePath: string = "./pdf/output.pdf";

  async getPdf(url: string): Promise<IPDFResponse> {
    try {
      const browser = await puppeteer.launch({ headless: "new", args: [
            "--no-sandbox",
            "--disable-gpu",
        ] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });

      // Wait for any dynamic content to load if necessary
      // e.g., page.waitForSelector('.some-element');
      const pdfOptions = {
        path: this.pdfFilePath,
        format: "A4" as PaperFormat,
      };
      await page.pdf(pdfOptions);

      await browser.close();
      console.log(`PDF generated successfully`);

      // Read the generated PDF file
      const file = await this.readFile(this.pdfFilePath);

      // Set the response headers for file download
      const headers = {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=output.pdf`,
        "Content-Length": file.length.toString(),
      };

      return { success: true, message: "PDF generated successfully", data: file, headers };
    } catch (error) {
      console.error("PDF generation failed:", error);
      throw new HttpException("PDF generation failed", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async readFile(filePath: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}
