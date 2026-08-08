import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, Public } from '../common/security'
import { result } from '../common/api'
import { User } from '../database/entities'
import { AuthService } from './auth.service'
import { LoginDto, RefreshDto } from './dto'

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Post('login') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() dto: LoginDto) { return result(await this.auth.login(dto), 'Login exitoso') }

  @Public() @Post('refresh') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Renovar tokens con rotación segura' })
  async refresh(@Body() dto: RefreshDto) { return result(await this.auth.refresh(dto.refreshToken), 'Token renovado') }

  @Post('logout') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  async logout(@CurrentUser() user: User) { await this.auth.logout(user); return result(null, 'Sesión cerrada') }

  @Get('me') @ApiBearerAuth()
  me(@CurrentUser() user: User) { return result(this.auth.serializeUser(user)) }
}
