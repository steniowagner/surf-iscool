import { CancellationRuleModel } from '@src/module/schedule/core/model/cancellation-rule.model';

export class ListCancellationRulesResponseDto {
  rules!: CancellationRuleModel[];
}
