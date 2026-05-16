import { describe, it, expect } from 'vitest';
import type {
  SuitabilityCategory,
  ConfidenceLevel,
  AssessmentStatus,
  SectionType,
  ValidityFlag,
  UserRole,
} from './types';

describe('Shared Types', () => {
  it('should allow valid suitability categories', () => {
    const categories: SuitabilityCategory[] = [
      'Highly Suitable',
      'Suitable',
      'Conditionally Suitable',
      'Not Suitable',
    ];
    expect(categories).toHaveLength(4);
  });

  it('should allow valid confidence levels', () => {
    const levels: ConfidenceLevel[] = [
      'High Confidence',
      'Moderate Confidence',
      'Low Confidence',
    ];
    expect(levels).toHaveLength(3);
  });

  it('should allow valid assessment statuses', () => {
    const statuses: AssessmentStatus[] = [
      'not_started',
      'in_progress',
      'completed',
      'interrupted',
      'expired',
    ];
    expect(statuses).toHaveLength(5);
  });

  it('should allow valid section types', () => {
    const sections: SectionType[] = ['personality', 'sjt'];
    expect(sections).toHaveLength(2);
  });

  it('should allow valid validity flags', () => {
    const flags: ValidityFlag[] = ['Valid', 'Cautionary', 'Invalid'];
    expect(flags).toHaveLength(3);
  });

  it('should allow valid user roles', () => {
    const roles: UserRole[] = ['administrator', 'candidate'];
    expect(roles).toHaveLength(2);
  });
});
