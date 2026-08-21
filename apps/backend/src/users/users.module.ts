import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Role, User, Client } from '../database/entities'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
@Module({ imports: [TypeOrmModule.forFeature([User, Role, Client])], controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
