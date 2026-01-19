import { HttpException, HttpStatus } from '@nestjs/common';

export class PersistenceClientException extends HttpException {
  constructor(message: string, detail?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        detail,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PersistenceInternalException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
