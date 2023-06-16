import { User } from '@fusionauth/typescript-client';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query, UnprocessableEntityException,
} from '@nestjs/common';
import {
  SignupResponse,
  UserRegistration,
  UsersResponse,
} from './api.interface';
import { ApiService } from './api.service';
import { ConfigResolverService } from './config.resolver.service';
import { FusionauthService } from './fusionauth/fusionauth.service';
import { OtpService } from './otp/otp.service';
import { SMSResponse } from './sms/sms.interface';
import { RefreshRequest } from '@fusionauth/typescript-client/build/src/FusionAuthClient';
import { ChangePasswordDTO } from '../user/dto/changePassword.dto';
import { LoginDto } from '../user/dto/login.dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CryptoJS = require('crypto-js');

CryptoJS.lib.WordArray.words;

@Controller('api')
export class ApiController {
  constructor(
    private readonly fusionAuthService: FusionauthService,
    private readonly otpService: OtpService,
    private readonly apiService: ApiService,
    private readonly configResolverService: ConfigResolverService,
  ) {}

  @Get()
  getHello(): any {
    return {
      respCode: '200',
      respMessage: 'Hello!',
    };
  }

  @Get('sendOTP')
  async sendOTP(
    @Query('phone') phone,
    @Query('errorMessage') errorMessage = 'User not found.',
    @Headers('x-application-id') applicationId?,
  ): Promise<any> {
    if (applicationId) {
      const { total }: { total: number; users: Array<User> } =
        await this.fusionAuthService.getUsersByString(
          `(username: ${phone}, mobilePhone: ${phone})`,
          0,
          1,
          applicationId,
          null,
        );
      if (!total || total == 0) {
        throw new UnprocessableEntityException(errorMessage);
      }
    }
    const status: SMSResponse = await this.otpService.sendOTP(phone);
    return { status };
  }

  @Get('verifyOTP')
  async verifyOTP(@Query('phone') phone, @Query('otp') otp): Promise<any> {
    const status: SMSResponse = await this.otpService.verifyOTP({ phone, otp });
    return { status };
  }

  @Post('login')
  async login(
    @Body() user: any,
    @Headers('authorization') authHeader,
  ): Promise<any> {
    const encStatus = this.configResolverService.getEncryptionStatus(
      user.applicationId,
    );
    if (encStatus) {
      const encodedBase64Key = this.configResolverService.getEncryptionKey(
        user.applicationId,
      );
      const parsedBase64Key =
        encodedBase64Key === undefined
          ? CryptoJS.enc.Base64.parse('bla')
          : CryptoJS.enc.Base64.parse(encodedBase64Key);
      user.loginId = this.apiService.decrypt(user.loginId, parsedBase64Key);
      user.password = this.apiService.decrypt(user.password, parsedBase64Key);
    }
    return await this.apiService.login(user, authHeader);
  }

  @Post('login/pin')
  async loginByPin(
    @Body() user: any,
    @Headers('authorization') authHeader,
  ): Promise<any> {
    const encStatus = this.configResolverService.getEncryptionStatus(
      user.applicationId,
    );
    const encodedBase64Key = this.configResolverService.getEncryptionKey(
      user.applicationId,
    );
    const parsedBase64Key =
      encodedBase64Key === undefined
        ? CryptoJS.enc.Base64.parse('bla')
        : CryptoJS.enc.Base64.parse(encodedBase64Key);
    if (encStatus) {
      user.loginId = this.apiService.decrypt(user.loginId, parsedBase64Key);
      // user.password = this.apiService.decrypt(user.password, parsedBase64Key);
    } else {
      user.password = this.apiService.encrypt(user.password, parsedBase64Key);
    }

    return await this.apiService.login(user, authHeader);
  }

  //
  @Get('all')
  async fetchUsers(
    @Query()
    data: {
      startRow: number;
      numberOfResults: number;
    },
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    return await this.apiService.fetchUsers(
      applicationId,
      data.startRow,
      data.numberOfResults,
      authHeader,
    );
  }

  @Post('changePassword')
  async updatePassword(
    @Body() data: { loginId: string; password: string },
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<SignupResponse> {
    return await this.apiService.updatePassword(
      data,
      applicationId,
      authHeader,
    );
  }

  @Post('changePin')
  async updatePin(
    @Body() data: { loginId: string; password: string },
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<SignupResponse> {
    const encodedBase64Key =
      this.configResolverService.getEncryptionKey(applicationId);
    const parsedBase64Key =
      encodedBase64Key === undefined
        ? CryptoJS.enc.Base64.parse('bla')
        : CryptoJS.enc.Base64.parse(encodedBase64Key);
    data.password = this.apiService.encrypt(data.password, parsedBase64Key);
    return await this.apiService.updatePassword(
      data,
      applicationId,
      authHeader,
    );
  }

  @Post('signup')
  async createUser(
    @Body() data: UserRegistration,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<SignupResponse> {
    return await this.apiService.createUser(data, applicationId, authHeader);
  }

  @Post('signupByPin')
  async createUserByPin(
    @Body() data: UserRegistration,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<SignupResponse> {
    return await this.apiService.createUserByPin(
      data,
      applicationId,
      authHeader,
    );
  }

  @Patch('updateUser/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() data: User,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<SignupResponse> {
    return await this.apiService.updateUser(
      userId,
      data,
      applicationId,
      authHeader,
    );
  }

  @Get('searchUserByQuery')
  async searchUser(
    @Query()
    query: {
      queryString: string;
      startRow: number;
      numberOfResults: number;
    },
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    console.log(query.numberOfResults);
    return await this.apiService.fetchUsersByString(
      query.queryString,
      query.startRow,
      query.numberOfResults,
      applicationId,
      authHeader,
    );
  }

  @Get('user/:userId')
  async searchUserbyId(
    @Param('userId') userId: string,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    const queryString = `(id: ${userId})`;  // pass the strict user ID filter
    return await this.apiService.fetchUsersByString(
      queryString,
      undefined,
      undefined,
      applicationId,
      authHeader,
    );
  }

  @Post('refresh-token')
  async refreshToken(
    @Body() refreshRequest: RefreshRequest,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    return this.apiService.refreshToken(
      applicationId,
      refreshRequest,
      authHeader,
    );
  }

  @Patch('/user/:userId/deactivate')
  async deactivateUserById(
    @Param('userId') userId: string,
    @Query('hardDelete') hardDelete = false,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    return await this.apiService.deactivateUserById(
      userId,
      hardDelete,
      applicationId,
      authHeader,
    );
  }

  @Patch('/user/:userId/activate')
  async activateUserById(
    @Param('userId') userId: string,
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
  ): Promise<UsersResponse> {
    return await this.apiService.activateUserById(
      userId,
      applicationId,
      authHeader,
    );
  }

  @Post('/changePassword/sendOTP')
  async changePasswordOTP(
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
    @Body() data: any,
  ): Promise<SignupResponse> {
    return await this.apiService.changePasswordOTP(
      data.username,
      applicationId,
      authHeader,
    );
  }

  @Patch('/changePassword/update')
  async changePassword(
    @Headers('authorization') authHeader,
    @Headers('x-application-id') applicationId,
    @Body() data: ChangePasswordDTO,
  ): Promise<SignupResponse> {
    return await this.apiService.changePassword(
      data,
      applicationId,
      authHeader,
    );
  }

  @Post('login/otp')
  async loginWithOtp(
    @Body() user: LoginDto,
    @Headers('authorization') authHeader,
  ): Promise<any> {
    return await this.apiService.loginWithOtp(user, authHeader);
  }
}
