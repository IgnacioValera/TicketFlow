import {
  ArgumentsHost,
  BadRequestException,
  CallHandler,
  Catch,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common'
import { Response } from 'express'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiResult<T> {
  __apiResult: true
  data: T
  message: string
  meta: PaginationMeta | null
}

export function result<T>(data: T, message = 'OK', meta: PaginationMeta | null = null): ApiResult<T> {
  return { __apiResult: true, data, message, meta }
}

export function pagination(page: number, perPage: number, total: number): PaginationMeta {
  return { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) }
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload instanceof StreamableFile) return payload
        if (payload && typeof payload === 'object' && '__apiResult' in payload) {
          const api = payload as ApiResult<unknown>
          return { success: true, message: api.message, data: api.data, meta: api.meta }
        }
        return { success: true, message: 'OK', data: payload ?? null, meta: null }
      }),
    )
  }
}

@Catch()
export class ApiExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Error interno del servidor'
    let code: string | null = null

    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      if (typeof body === 'string') message = body
      else if (body && typeof body === 'object' && 'message' in body) {
        const payload = body as { message: string | string[]; code?: string }
        const raw = payload.message
        message = Array.isArray(raw) ? raw.join(', ') : raw
        code = payload.code ?? null
      }
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        message = 'El archivo no debe superar 5 MB'
      }
    } else if (isMulterFileTooLarge(exception)) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        message: 'El archivo no debe superar 5 MB',
        data: null,
        meta: null,
        code: null,
      })
      return
    }

    response.status(status).json({ success: false, message, data: null, meta: null, code })
  }
}

export function parsePagination(page = 1, perPage = 10) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 10))
  if (!Number.isFinite(safePage) || !Number.isFinite(safePerPage)) throw new BadRequestException('Paginación inválida')
  return { page: safePage, perPage: safePerPage, skip: (safePage - 1) * safePerPage }
}

function isMulterFileTooLarge(exception: unknown) {
  if (!exception || typeof exception !== 'object') return false
  const error = exception as { name?: string; code?: string }
  return error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE'
}
