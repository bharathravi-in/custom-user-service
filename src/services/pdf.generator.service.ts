import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { IPDFResponse } from "../interfaces/common.interface";
import puppeteer, { PaperFormat } from "puppeteer";
import * as fs from "fs";
const { URLSearchParams } = require('url');

@Injectable()
export class PDFService {
  private readonly pdfFilePath: string = "./pdf/output.pdf";

  async getPdf(url: string): Promise<IPDFResponse> {
    try {
      let xformUrl; 
      const browser = await puppeteer.launch({ headless: "new", devtools: true, args: [
            "--no-sandbox",
            "--disable-gpu",
        ] });
      const page = await browser.newPage();
      await page.setRequestInterception(true); 
      page.on('console', (message) => {   console.log(`Console message: ${message.text()}`); });
      page.on('request', async (request) => {  
        
        // Check if the request is for the desired endpoint
        if (request.url() === 'https://enketo.upsmfac.org/enketo/transform/xform') {
          // Create the x-www-form-urlencoded body with the stored xformUrl
          console.log(`Request URL: ${request.url()}`); 
          const body = new URLSearchParams();
          body.append('xformUrl', xformUrl);
          console.log("-----request body----", request.postData());
          console.log("-----request headers----", request.headers());
          // Modify the request to include the modified body
          console.log("#######Modified body and header####");
          console.log("-----request body----", body.toString());
          console.log("-----request headers----", request.headers());
          await request.continue({
            postData: body.toString(),
            headers: {
              ...request.headers(),
            }
          });
        } else if (request.url().includes('https://enketo.upsmfac.org/enketo/preview')) {
          // Extract xformUrl from the initial request URL
          console.log(`Request URL: ${request.url()}`); 
          const requestUrl = new URL(request.url());
          xformUrl = requestUrl.searchParams.get('xform');
          console.log("-----xformUrl---", xformUrl);
          // Continue the request without modifying it
          await request.continue();
        } else {
          // Continue the request without modifying it
          await request.continue();
        }
      });      
      page.on('response', (response) => {   
        console.log(`Response URL: ${response.url()}`);   
        console.log(`Response status: ${response.status()}`); 
      });
      // await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.screenshot({ fullPage: true, path: 'screenshot.png' })

      // Wait for any dynamic content to load if necessary
      // e.g., page.waitForSelector('.some-element');
      const pdfOptions = {
        path: this.pdfFilePath,
        format: "A4" as PaperFormat,
      };
      await page.pdf(pdfOptions);
      // const source1 = await page.content();

      // console.log("page content", source1);
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