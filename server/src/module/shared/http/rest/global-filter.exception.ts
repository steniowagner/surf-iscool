import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();

    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    if (exception instanceof PersistenceClientException) {
      const meta = getPgErrorMetadata(exception);
      if (meta.code === '23505') {
        const error = new ConflictException({
          message: 'Duplicate resource',
        });
        return res.status(error.getStatus()).json(error.getResponse());
      }
      if (meta.code === '23503') {
        const error = new BadRequestException({
          message: 'Invalid relation',
        });
        return res.status(error.getStatus()).json(error.getResponse());
      }
      const error = new BadRequestException({
        message: 'Invalid request',
      });
      return res.status(error.getStatus()).json(error.getResponse());
    }

    if (exception instanceof PersistenceInternalException) {
      const error = new InternalServerErrorException({
        message: 'Database operation failed',
      });
      return res.status(error.getStatus()).json(error.getResponse());
    }

    const error = new InternalServerErrorException({
      message: 'Unexpected error',
    });
    return res.status(error.getStatus()).json(error.getResponse());
  }
}
