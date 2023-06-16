export interface IResponse {
    success: boolean,
    message: string,
}

export interface IFileResponseHeader {
    "Content-Type": string,
    "Content-Disposition": string,
    "Content-Length": string,
}

export interface IPDFResponse extends IResponse {
    data: Buffer,
    headers:  IFileResponseHeader,
}

