// Placeholder for shared types - will be populated in task 1.4
export type SuitabilityCategory =
  | 'Highly Suitable'
  | 'Suitable'
  | 'Conditionally Suitable'
  | 'Not Suitable';

export type ConfidenceLevel =
  | 'High Confidence'
  | 'Moderate Confidence'
  | 'Low Confidence';

export type AssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'interrupted'
  | 'expired';

export type SectionType = 'personality' | 'sjt';

export type ValidityFlag = 'Valid' | 'Cautionary' | 'Invalid';

export type UserRole = 'administrator' | 'candidate';
