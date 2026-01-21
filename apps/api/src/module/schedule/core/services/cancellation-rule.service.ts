import { Injectable } from '@nestjs/common';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { CancellationRuleRepository } from '@src/module/schedule/persistence/repository/cancellation-rule.repository';

import { CancellationRuleModel } from '../model/cancellation-rule.model';

type CreateRuleParams = {
  name: string;
  hoursBeforeClass: number;
  adminId: string;
};

type UpdateRuleParams = {
  id: string;
  name?: string;
  hoursBeforeClass?: number;
  isActive?: boolean;
};

@Injectable()
export class CancellationRuleService {
  constructor(
    private readonly cancellationRuleRepository: CancellationRuleRepository,
  ) {}

  async create(params: CreateRuleParams): Promise<CancellationRuleModel> {
    // Deactivate all existing rules before creating a new active one
    await this.cancellationRuleRepository.deactivateAll();

    return this.cancellationRuleRepository.create({
      name: params.name,
      hoursBeforeClass: params.hoursBeforeClass,
      createdBy: params.adminId,
    });
  }

  async findAll(): Promise<CancellationRuleModel[]> {
    return this.cancellationRuleRepository.findAll();
  }

  async findById(id: string): Promise<CancellationRuleModel> {
    const rule = await this.cancellationRuleRepository.findById(id);

    if (!rule) throw new DomainException('Cancellation rule not found');

    return rule;
  }

  async getActiveRule(): Promise<CancellationRuleModel | null> {
    return this.cancellationRuleRepository.findActive();
  }

  async update(params: UpdateRuleParams): Promise<CancellationRuleModel> {
    const existingRule = await this.cancellationRuleRepository.findById(
      params.id,
    );

    if (!existingRule) throw new DomainException('Cancellation rule not found');

    // If activating this rule, deactivate all others first
    if (params.isActive === true) {
      await this.cancellationRuleRepository.deactivateAll();
    }

    const updatedRule = await this.cancellationRuleRepository.update({
      id: params.id,
      name: params.name,
      hoursBeforeClass: params.hoursBeforeClass,
      isActive: params.isActive,
    });

    if (!updatedRule) throw new DomainException('Failed to update rule');

    return updatedRule;
  }

  async delete(id: string): Promise<CancellationRuleModel> {
    const existingRule = await this.cancellationRuleRepository.findById(id);

    if (!existingRule) throw new DomainException('Cancellation rule not found');

    const deletedRule = await this.cancellationRuleRepository.delete(id);

    if (!deletedRule) throw new DomainException('Failed to delete rule');

    return deletedRule;
  }
}
