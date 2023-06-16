import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { IResponse } from "../interfaces/common.interface";

@Injectable()
export class LoggerService {
    private readonly logFilePath: string = "./logs/events.log";

    public logEvent(event: any): IResponse {
        try {
            const logEntry = JSON.stringify(event);
            fs.appendFileSync(this.logFilePath, `${logEntry}\n`);  
            return { success: true, message: 'Event logged successfully' };
        } catch(error) {
            return { success: false, message: 'Failed to log event' };
        }
    }
}