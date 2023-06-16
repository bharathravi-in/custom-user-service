import { SearchResponse } from '@fusionauth/typescript-client';
import ClientResponse from '@fusionauth/typescript-client/build/src/ClientResponse';
import { Body, Controller, Get, Res, Patch, Post, Query, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ChangePasswordDTO } from './dto/changePassword.dto';

import { FusionauthService } from './fusionauth/fusionauth.service';
import { OtpService } from './otp/otp.service';
import { SMSResponse, SMSResponseStatus } from './sms/sms.interface';
import { ResponseCode, SignupResponse, UsersResponse } from './user.interface';
import { UserService } from './user.service';
import fetch  from 'cross-fetch';
import { diskStorage } from 'multer';
import * as xlsx from 'xlsx';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import { Response } from 'express';
import { Storage, UploadResponse } from '@google-cloud/storage';

@Controller('user')
export class UserController {
  constructor(
    private readonly fusionAuthService: FusionauthService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
  ) {}
  
  uploadToGcpBucket(xmlFilePath: string, xmlFileName: string): Promise<UploadResponse> {
    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    try {
     return storage.bucket(process.env.GCP_BUCKET_NAME).upload(xmlFilePath, {
        destination: `affiliation/${xmlFileName}`,
      });
    } catch (error) {
      console.error('Error uploading XML file to GCP bucket:', error);
      throw error;
    }
  }
  

  @Get('/otpSend')
  async otpSend(@Query('phone') phone): Promise<any> {
    const res = await fetch(`https://2factor.in/API/V1/${process.env.OTP_SERVICE_API_KEY}/SMS/${phone}/AUTOGEN/OTP1`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    const result = await res.json();
    return { data: result.data };
  }



  // @Post('/otpVerify')
  // async otpVerify(@Body() otpDetails: any): Promise<any> {
  //     const  {phone, otp, applicationId} = otpDetails;
  //     const res = await fetch(`https://2factor.in/API/V1/efaa87ae-f562-11ed-addf-0200cd936042/SMS/VERIFY3/${phone}/${otp}`, {
  //     headers: {
  //     "Content-Type": "application/json",
  //     },
  //     method: "GET",
  //   });
  //   const result = await res.json();
  //   // return { data: result };
  //   console.log("otpVerify response", result);
  //   if (result.Status === "Success") {
  //     // OTP verification is successful, make another API call to fetch user details
  //     try {
  //       const response: SignupResponse = await this.userService.login({loginId: phone, password: phone, applicationId: applicationId});
  
  //       return response;
  //     } catch (error) {
  //       throw new HttpException('Error fetching user details', HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   } else {
  //     // OTP verification failed
  //     throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
  //   }

  // }



  @Get('/otpVerify')
  async otpVerify(@Query('phone') phone, @Query('otp') otp): Promise<any> {
      const res = await fetch(`https://2factor.in/API/V1/${process.env.OTP_SERVICE_API_KEY}/SMS/VERIFY3/${phone}/${otp}`, {
      headers: {
      "Content-Type": "application/json",
      },
      method: "GET",
    });
    const result = await res.json();
    return { data: result };

  }

  @Get('/verify')
  async verifyUsernamePhoneCombination(): Promise<any> {
    const status: boolean =
      await this.fusionAuthService.verifyUsernamePhoneCombination();
    return { status };
  }

  @Get('/sendOTP')
  async sendOTP(@Query('phone') phone): Promise<any> {
    const status: SMSResponse = await this.otpService.sendOTP(phone);
    return { status };
  }

  @Get('/verifyOTP')
  async verifyOTP(@Query('phone') phone, @Query('otp') otp): Promise<any> {
    const status: SMSResponse = await this.otpService.verifyOTP({ phone, otp });
    return { status };
  }

  @Post('/signup')
  async signup(@Body() user: any): Promise<SignupResponse> {
    const status: SignupResponse = await this.userService.signup(user);
    return status;
  }

  @Post('/login')
  async login(@Body() user: any): Promise<SignupResponse> {
    if (
      [
        // for the below listed application Ids, we'll be encrypting the creds received
        process.env.FUSIONAUTH_APPLICATION_ID,
        process.env.FUSIONAUTH_HP_ADMIN_CONSOLE_APPLICATION_ID,
      ].indexOf(user.applicationId) !== -1
    ) {
      user.loginId = this.userService.encrypt(user.loginId);
      user.password = this.userService.encrypt(user.password);
    }
    const status: SignupResponse = await this.userService.login(user);
    return status;
  }

  @Patch('/update')
  async update(@Body() user: any): Promise<SignupResponse> {
    const status: SignupResponse = await this.userService.update(user);
    return status;
  }

  @Post('/changePassword/sendOTP')
  async changePasswordOTP(@Body() data: any): Promise<SignupResponse> {
    const status: SignupResponse = await this.userService.changePasswordOTP(
      data.username,
    );
    return status;
  }

  @Patch('/changePassword/update')
  async changePassword(
    @Body() data: ChangePasswordDTO,
  ): Promise<SignupResponse> {
    const status: SignupResponse = await this.userService.changePassword(data);
    return status;
  }

  @Post('/convert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
          cb(null, `${file.originalname}`);

        },
      }),
    }),
  )
  convert(@UploadedFile() xlsxFile: any, @Res() res: Response): void {
    const workbook = xlsx.readFile(xlsxFile.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(sheet);
    
    // Convert the JSON data to a format suitable for XML conversion
    const xmlData = { data: jsonData };
  
    const xmlBuilder = new xml2js.Builder();
    let xmlString: string;
    try {
      xmlString = xmlBuilder.buildObject(xmlData);
    } catch (error) {
      console.error('Error building XML:', error);
      res.status(500).send('Error building XML');
      return;
    }
    
    const xmlFileName = xlsxFile.filename.replace('.xlsx', '.xml');
    const xmlFilePath = xlsxFile.path.replace('.xlsx', '.xml');

  
    fs.writeFile(xmlFilePath, xmlString,async (error) => {
      if (error) {
        console.error('Error writing XML file:', error);
        res.status(500).send('Error writing XML file');
        return;
      }
        try {
          const uploadResponse = await this.uploadToGcpBucket(xmlFilePath, xmlFileName);
          const  [ file ] = uploadResponse;
          console.log("File uploaded successfully.", uploadResponse)
          // res.status(200).send('File uploaded successfully.');
          // Cleanup the generated .xml and uploaded .xlsx files
          fs.unlink(xmlFilePath, (unlinkError) => {
            if (unlinkError) {
              console.error('Error deleting XML file:', unlinkError);
            }
            fs.unlink(xlsxFile?.path, (unlinkUploadError) => {
              if (unlinkUploadError) {
                console.error('Error deleting uploaded file:', unlinkUploadError);
              }
            });
          });
          res.status(200).json({ fileName: xmlFileName, fileUrl: file.metadata.mediaLink});
	  } catch (uploadError) {
	  console.log('Error uploading XML file to GCP bucket', uploadError);
          res.status(500).send('Error uploading XML file to GCP bucket');
        }
    });
  }
}
