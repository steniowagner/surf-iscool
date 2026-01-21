import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { CancellationRuleService } from '../../../core/services/cancellation-rule.service';
import { CreateCancellationRuleBodyDto } from '../dto/request/create-cancellation-rule.body.dto';
import { UpdateCancellationRuleBodyDto } from '../dto/request/update-cancellation-rule.body.dto';
import { CancellationRuleResponseDto } from '../dto/response/cancellation-rule.response.dto';
import { ListCancellationRulesResponseDto } from '../dto/response/list-cancellation-rules.response.dto';

@Controller('admin/cancellation-rules')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminCancellationRuleController {
  constructor(
    private readonly cancellationRuleService: CancellationRuleService,
  ) {}

  @Post()
  async create(
    @Body() body: CreateCancellationRuleBodyDto,
    @CurrentUser() admin: UserModel,
  ): Promise<CancellationRuleResponseDto> {
    const rule = await this.cancellationRuleService.create({
      name: body.name,
      hoursBeforeClass: body.hoursBeforeClass,
      adminId: admin.id,
    });
    return { rule };
  }

  @Get()
  async listAll(): Promise<ListCancellationRulesResponseDto> {
    const rules = await this.cancellationRuleService.findAll();
    return { rules };
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<CancellationRuleResponseDto> {
    const rule = await this.cancellationRuleService.findById(id);
    return { rule };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCancellationRuleBodyDto,
  ): Promise<CancellationRuleResponseDto> {
    const rule = await this.cancellationRuleService.update({
      id,
      name: body.name,
      hoursBeforeClass: body.hoursBeforeClass,
      isActive: body.isActive,
    });
    return { rule };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<CancellationRuleResponseDto> {
    const rule = await this.cancellationRuleService.delete(id);
    return { rule };
  }
}
