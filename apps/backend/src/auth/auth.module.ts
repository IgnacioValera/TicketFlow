import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RefreshToken, User } from '../database/entities'
import { AuthController } from './auth.controller'
import { JwtAuthGuard, MustChangePasswordGuard, PermissionsGuard } from './auth.guard'
import { AuthService } from './auth.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard, MustChangePasswordGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard, MustChangePasswordGuard, JwtModule],
})
export class AuthModule {}
