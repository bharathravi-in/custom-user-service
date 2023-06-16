import { Controller, Inject, Get, Query, Res } from '@nestjs/common';
import { PDFService } from '../services/pdf.generator.service';
import { Response } from 'express'

@Controller('pdf')
export class PdfController {
  constructor(
    @Inject(PDFService) private readonly pdfService: PDFService
    ) {}


  @Get('getPDF')
  async getPDF(@Query('url') url, @Res() res: Response): Promise<any> {
    const response = await this.pdfService.getPdf(url);
    // Set the response headers
    res.setHeader('Content-Length', String(response.headers['Content-Length']));
    res.setHeader('Content-Disposition', String(response.headers['Content-Disposition']));
    res.setHeader('Content-Type', String(response.headers['Content-Type']));
    res.send(response.data);
    // return response;
  }
  
}