import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AllowWhilePasswordChange, CurrentUser, Public } from '../common/security'
import { result } from '../common/api'
import { User } from '../database/entities'
import { AuthService } from './auth.service'
import { ChangePasswordDto, LoginDto, RefreshDto } from './dto'

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Post('login') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() dto: LoginDto) { return result(await this.auth.login(dto), 'Login exitoso') }

  @Public() @Post('refresh') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Renovar tokens con rotación segura' })
  async refresh(@Body() dto: RefreshDto) { return result(await this.auth.refresh(dto.refreshToken), 'Token renovado') }

  @Post('logout') @HttpCode(HttpStatus.OK) @ApiBearerAuth() @AllowWhilePasswordChange()
  async logout(@CurrentUser() user: User) { await this.auth.logout(user); return result(null, 'Sesión cerrada') }

  @Get('me') @ApiBearerAuth() @AllowWhilePasswordChange()
  me(@CurrentUser() user: User) { return result(this.auth.serializeUser(user)) }

  @Post('change-password') @HttpCode(HttpStatus.OK) @ApiBearerAuth() @AllowWhilePasswordChange()
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado' })
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto)
    return result(null, 'Tu contraseña se actualizó correctamente.')
  }
}
