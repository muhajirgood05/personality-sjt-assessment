# Implementation Plan: Personality & SJT Assessment Platform

## Overview

This implementation plan covers the full build-out of a web-based psychological assessment platform for the MINTS scholarship selection at Kementerian Keuangan. The platform administers a Personality Test (forced-choice Big Five) and a Situational Judgement Test (SJT), with anti-faking mechanisms, IRT-based scoring, composite suitability scoring, and comprehensive report generation. The tech stack is Node.js/TypeScript (Express/Fastify) backend, React/TypeScript frontend, PostgreSQL, Redis, and Puppeteer for PDF generation.

## Tasks

- [x] 1. Project setup and core infrastructure
  - [x] 1.1 Initialize monorepo structure with backend and frontend packages
    - Create directory structure: `packages/backend`, `packages/frontend`, `packages/shared`
    - Initialize `package.json` for each package with TypeScript configuration
    - Configure `tsconfig.json` with strict mode for backend, frontend, and shared types
    - Set up ESLint and Prettier configurations
    - Set up testing framework: Vitest + fast-check for backend, Vitest + React Testing Library for frontend
    - _Requirements: 16.1, 16.2_

  - [x] 1.2 Set up PostgreSQL database schema and migrations
    - Create migration files for all entities: `candidates`, `administrators`, `assessment_sessions`, `assessments`, `items`, `responses`, `scoring_results`, `anti_faking_results`, `audit_log`, `normative_sample`
    - Define JSONB column structures for item content, navigation attempts, scores
    - Add indexes on foreign keys and frequently queried columns (candidate_id, session_id, status)
    - Set up database connection pooling with health checks
    - _Requirements: 14.1, 14.5_

  - [x] 1.3 Set up Redis connection and configuration
    - Configure Redis client with connection pooling
    - Define key namespaces for sessions, timers, and offline queues
    - Implement Redis health check utility
    - _Requirements: 1.4, 4.7_

  - [x] 1.4 Define shared TypeScript interfaces and types
    - Create shared types: `ResponsePayload`, `TimerSync`, `ScoringResult`, `SuitabilityCategory`, `ConfidenceLevel`
    - Define API request/response DTOs for all endpoints
    - Define database entity types matching the schema
    - Define enums for assessment status, section types, validity flags
    - _Requirements: 8.1, 9.1, 10.1_

- [x] 2. Authentication and session management
  - [x] 2.1 Implement JWT authentication with refresh tokens
    - Create auth middleware for JWT verification
    - Implement login endpoint with credential validation and bcrypt password comparison
    - Implement token refresh endpoint
    - Implement logout endpoint with token invalidation in Redis
    - Implement account lockout after 3 failed attempts with 15-minute duration
    - Store failed attempt counter in Redis with TTL
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 2.2 Write property test for session lockout threshold
    - **Property 16: Session Lockout Threshold**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Implement session management and heartbeat
    - Create session state storage in Redis (assessment progress, current item, timer state)
    - Implement heartbeat endpoint that updates last-seen timestamp
    - Implement session interruption detection (no heartbeat for 60+ seconds)
    - Implement session resumption within 30-minute window
    - Implement 30-minute inactivity timeout
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.4 Write property test for timer integrity during disconnection
    - **Property 15: Timer Integrity During Disconnection**
    - **Validates: Requirements 1.6, 4.7**

  - [ ]* 2.5 Write property test for response preservation on interruption
    - **Property 17: Response Preservation on Interruption**
    - **Validates: Requirements 1.5**

  - [x] 2.6 Implement RBAC middleware
    - Define roles: Administrator, Candidate
    - Create role-checking middleware for route protection
    - Restrict result access to authorized Administrators only
    - _Requirements: 14.3, 14.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Personality test item delivery and assembly
  - [x] 4.1 Implement item bank data model and seeding
    - Create item repository with CRUD operations
    - Implement item seeding script for personality test items (forced-choice pairs with social desirability ratings)
    - Implement item seeding for consistency-check pairs and social desirability items
    - _Requirements: 2.1, 2.7, 7.1_

  - [x] 4.2 Implement test assembly algorithm
    - Build assembly function that selects 120–180 items from the item bank
    - Ensure minimum 24 items per OCEAN dimension
    - Ensure each dimension appears 10–14 times per test half
    - Place consistency-check pairs at least 20 positions apart
    - Place social desirability items at least 5 positions apart
    - Ensure reverse-scored items comprise at least 30% of total
    - Use cryptographically secure randomization with per-candidate seed
    - _Requirements: 2.2, 2.3, 2.5, 2.7, 7.1, 15.1, 15.5_

  - [ ]* 4.3 Write property test for test assembly invariants
    - **Property 1: Test Assembly Invariants**
    - **Validates: Requirements 2.2, 2.3, 2.5, 2.7, 7.1, 15.5**

  - [ ]* 4.4 Write property test for social desirability matching constraint
    - **Property 2: Social Desirability Matching Constraint**
    - **Validates: Requirements 2.1**

  - [x] 4.5 Implement personality test item delivery API
    - Create `POST /api/assessment/start` endpoint for personality section
    - Create `GET /api/assessment/current-item` endpoint returning current forced-choice pair
    - Implement forward-only navigation (no backward, no skip)
    - Implement 120-second inactivity reminder (no auto-advance)
    - Record item presentation timestamp for response time tracking
    - _Requirements: 2.4, 2.6, 2.8_

- [x] 5. SJT item delivery and ranking
  - [x] 5.1 Implement SJT item bank and seeding
    - Create SJT item repository with scenario content, options, and expert rankings
    - Seed minimum 25 scenarios covering all 5 Kemenkeu values (minimum 5 per value)
    - Implement scenario and option order randomization per candidate
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 5.2 Implement SJT delivery and response API
    - Create SJT start endpoint initializing the section
    - Implement scenario delivery with randomized option order
    - Implement ranking submission with validation (valid permutation, no ties, no gaps)
    - Implement elaboration validation (50–500 characters)
    - Prevent modification of previously submitted scenarios
    - Auto-submit completed responses on timer expiration
    - _Requirements: 3.3, 3.4, 3.7, 3.8, 3.9_

  - [ ]* 5.3 Write property test for SJT ranking validation
    - **Property 18: SJT Ranking Validation**
    - **Validates: Requirements 3.3, 3.4**

- [x] 6. Timer management
  - [x] 6.1 Implement server-side timer service
    - Create timer initialization (45 min personality, 60 min SJT) stored in Redis
    - Implement server-side countdown that continues during disconnection
    - Implement timer expiration event that triggers auto-submit
    - Implement timer sync endpoint returning remaining time with server timestamp
    - _Requirements: 4.1, 4.2, 4.5, 4.7_

  - [x] 6.2 Implement client-side timer display component
    - Create `SectionTimer` React component with MM:SS display
    - Implement standard styling for >5 minutes remaining
    - Implement red pulsing animation for ≤5 minutes remaining
    - Implement early submission confirmation dialog
    - Sync with server timer on heartbeat responses
    - _Requirements: 4.3, 4.4, 4.6_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Anti-faking systems
  - [x] 8.1 Implement response time tracking
    - Record item render timestamp on frontend
    - Calculate response time (render to submit) in milliseconds
    - Send response time with each response payload
    - Flag personality items < 1500ms, SJT items < 8000ms
    - Exclude items > 300000ms from CV calculation
    - Calculate coefficient of variation per item type
    - Mark assessment with "response time concern" when >20% flagged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 8.2 Write property test for response time flagging
    - **Property 4: Response Time Flagging**
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [ ]* 8.3 Write property test for response time concern threshold
    - **Property 5: Response Time Concern Threshold**
    - **Validates: Requirements 5.7**

  - [ ]* 8.4 Write property test for coefficient of variation calculation
    - **Property 6: Coefficient of Variation Calculation**
    - **Validates: Requirements 5.6**

  - [x] 8.5 Implement consistency index calculation
    - Compare responses to 15 matched item pairs
    - Record inconsistency when pair responses differ by >2 points
    - Calculate consistency index as consistent pairs / total evaluated pairs × 100
    - Exclude pairs with unanswered items from calculation
    - Flag assessment when index < 60%
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 8.6 Write property test for consistency index calculation
    - **Property 3: Consistency Index Calculation**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**

  - [x] 8.7 Implement social desirability detection
    - Calculate SD score from 10 embedded items (count of keyed responses, 0–10)
    - Compare against normative sample 90th percentile
    - Flag "impression management concern" when exceeding threshold
    - Apply SD score as covariate to adjust personality scores (max 1 SD shift)
    - Generate both raw and adjusted personality scores
    - Display normative sample reliability warning when n < 200
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 8.8 Write property test for social desirability score and adjustment
    - **Property 7: Social Desirability Score and Adjustment**
    - **Validates: Requirements 7.2, 7.4**

  - [ ]* 8.9 Write property test for social desirability flagging
    - **Property 8: Social Desirability Flagging**
    - **Validates: Requirements 7.3**

- [x] 9. Scoring engine - Personality
  - [x] 9.1 Implement IRT-based OCEAN scoring
    - Calculate raw scores for each OCEAN dimension from forced-choice responses
    - Normalize to sten scale (1–10) using normative sample mean and standard deviation
    - Calculate sub-facet scores (minimum 6 facets per dimension) on sten scale
    - Handle insufficient valid responses with error reporting
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [ ]* 9.2 Write property test for sten score normalization
    - **Property 9: Sten Score Normalization**
    - **Validates: Requirements 8.2, 8.3**

  - [x] 9.3 Implement OCEAN to Kemenkeu values mapping
    - Map dimensions to values: Integritas=avg(reverse(N)), Profesionalisme=avg(C, reverse(N)), Sinergi=avg(A, E), Pelayanan=avg(A, E), Kesempurnaan=avg(C, O)
    - Calculate alignment score (sten 1–10) for each value
    - _Requirements: 8.5, 8.7_

  - [ ]* 9.4 Write property test for OCEAN to Kemenkeu values mapping
    - **Property 10: OCEAN to Kemenkeu Values Mapping**
    - **Validates: Requirements 8.5, 8.7**

- [x] 10. Scoring engine - SJT
  - [x] 10.1 Implement SJT concordance scoring
    - Compare candidate rankings to expert rankings per scenario
    - Apply 2× weight for most/least effective positions, 1× for middle
    - Calculate per-value score normalized to 0–100
    - Handle partial completion (score only completed scenarios)
    - _Requirements: 9.1, 9.2, 9.3, 9.6_

  - [ ]* 10.2 Write property test for SJT concordance scoring
    - **Property 11: SJT Concordance Scoring**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 10.3 Implement elaboration scoring
    - Evaluate elaboration responses for coherence and alignment with ranking
    - Produce 0–100 score per elaboration using keyword/semantic analysis
    - _Requirements: 9.5_

- [x] 11. Scoring engine - Composite and classification
  - [x] 11.1 Implement composite suitability score
    - Calculate personality-value alignment sub-score (normalized 0–100)
    - Calculate SJT-value alignment sub-score (normalized 0–100)
    - Compute composite: 0.4 × personality + 0.6 × SJT
    - Classify into category: Highly Suitable (≥80), Suitable (60–79), Conditionally Suitable (40–59), Not Suitable (<40)
    - _Requirements: 10.1, 10.2_

  - [ ]* 11.2 Write property test for composite suitability score
    - **Property 12: Composite Suitability Score**
    - **Validates: Requirements 10.1**

  - [ ]* 11.3 Write property test for suitability category classification
    - **Property 13: Suitability Category Classification**
    - **Validates: Requirements 10.2**

  - [x] 11.4 Implement confidence qualifier and validity warnings
    - Assign confidence level based on flagged response % and inconsistency flags
    - High: 0% flagged AND 0 inconsistency flags
    - Moderate: 1–29% flagged OR 1–2 inconsistency flags
    - Low: ≥30% flagged OR ≥3 inconsistency flags
    - Append validity warning when ≥3 inconsistency flags OR >30% flagged
    - Generate improvement recommendations for below-50th-percentile values
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ]* 11.5 Write property test for confidence qualifier and validity warning
    - **Property 14: Confidence Qualifier and Validity Warning**
    - **Validates: Requirements 10.4, 10.5**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Report generation
  - [x] 13.1 Implement web report components
    - Create personality profile view with radar/bar chart for OCEAN dimensions (0–100)
    - Create facet breakdown per dimension with sten scores
    - Create narrative interpretation (max 200 words per dimension)
    - Create Kemenkeu values radar chart with per-value scores (0–100)
    - Create behavioral examples section (1–3 per value from elaborations)
    - Create Assessment Validity section (consistency index, response times, SD score, validity flag)
    - Create improvement recommendations section
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 13.2 Implement PDF report generation
    - Set up Puppeteer/Playwright for headless rendering
    - Render React report components to PDF
    - Ensure PDF generation completes within 15 seconds
    - Handle incomplete data with section-level notices
    - Implement `GET /api/reports/:candidateId/pdf` endpoint
    - _Requirements: 11.6, 11.7_

  - [x] 13.3 Implement report API endpoints
    - Create `GET /api/reports/:candidateId` for web report data
    - Create `GET /api/reports/session/:sessionId/export` for CSV/Excel export
    - Restrict access to authorized Administrators
    - _Requirements: 11.6, 12.5_

- [x] 14. Frontend - Candidate assessment flow
  - [x] 14.1 Implement login page and auth flow
    - Create login form with credential input
    - Display lockout message with remaining duration
    - Store JWT in memory (not localStorage) for security
    - Implement token refresh on 401 responses
    - _Requirements: 1.1, 1.2_

  - [x] 14.2 Implement instructions and practice pages
    - Create general instructions page (purpose, duration, section overview)
    - Create personality test instructions with practice example
    - Create SJT instructions with practice scenario
    - Require completion of minimum 2 practice items per section
    - Provide feedback on practice responses
    - Display all content in Bahasa Indonesia
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 14.3 Implement forced-choice personality test UI
    - Create `ForcedChoiceItem` component with two statements and 5-point graded scale
    - Implement forward-only navigation (no back button, no skip)
    - Display progress indicator
    - Implement 120-second inactivity reminder
    - Record item render timestamp for response time calculation
    - Implement auto-save every 30 seconds
    - _Requirements: 2.4, 2.6, 2.8, 16.5_

  - [x] 14.4 Implement SJT ranking UI
    - Create `RankingInput` component with drag-and-drop ranking
    - Create `ElaborationTextField` component with character count (50–500)
    - Validate complete ranking (no ties, no gaps) before submission
    - Prevent modification of previously submitted scenarios
    - Display validation errors in Bahasa Indonesia
    - _Requirements: 3.3, 3.4, 3.7, 3.8_

  - [x] 14.5 Implement offline queue and auto-save
    - Create IndexedDB-based offline queue for responses
    - Implement auto-save every 30 seconds
    - Detect connection loss and queue responses locally
    - Synchronize queued responses on reconnection
    - Implement heartbeat service (every 30 seconds)
    - _Requirements: 16.5, 16.6_

  - [ ]* 14.6 Write property test for offline queue synchronization
    - **Property 20: Offline Queue Synchronization**
    - **Validates: Requirements 16.6**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Admin dashboard
  - [x] 16.1 Implement session management API
    - Create `POST /api/admin/sessions` with validation (end > start, non-empty candidate list, timer bounds)
    - Create `GET /api/admin/sessions` listing all sessions
    - Create `GET /api/admin/sessions/:id/candidates` with real-time progress
    - Update candidate progress within 30 seconds of status change
    - _Requirements: 12.1, 12.2, 12.3, 12.7_

  - [ ]* 16.2 Write property test for session configuration validation
    - **Property 19: Session Configuration Validation**
    - **Validates: Requirements 12.7**

  - [x] 16.3 Implement admin dashboard frontend
    - Create dashboard overview (active assessments, completion summary, aggregate stats)
    - Create session creation form with validation
    - Create candidate progress table with status indicators
    - Create analytics view with distribution charts (suitability scores, OCEAN, values)
    - Create anti-faking indicators display with descriptions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

  - [x] 16.4 Implement audit log
    - Record all data access events (accessor, timestamp, action, resource)
    - Create `GET /api/admin/audit-log` endpoint with filtering
    - Store IP address with each log entry
    - _Requirements: 14.5_

- [x] 17. Security features
  - [x] 17.1 Implement assessment security controls
    - Disable browser copy, print, and screenshot during active sessions (CSS + JS)
    - Detect and log navigation away attempts
    - Detect and log tab/window focus loss, increment focus_loss_count
    - Prevent access to assessment content outside active authenticated sessions
    - _Requirements: 15.2, 15.3, 15.4, 15.6_

  - [x] 17.2 Implement data encryption and retention
    - Configure AES-256 encryption at rest for assessment data
    - Enforce TLS 1.2+ for all API communication
    - Implement data retention policy (2-year max, auto-archive/delete)
    - _Requirements: 14.1, 14.2, 14.6_

- [x] 18. Integration wiring and E2E flow
  - [x] 18.1 Wire complete candidate assessment flow
    - Connect login → instructions → practice → personality test → SJT → results
    - Ensure session state persists across sections
    - Implement section transitions with timer resets
    - Trigger scoring pipeline on assessment completion
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1, 9.1, 10.1_

  - [x] 18.2 Wire admin flow
    - Connect dashboard → session creation → candidate monitoring → reports → export
    - Ensure real-time progress updates
    - Wire report viewing and PDF download
    - _Requirements: 12.1, 11.6_

  - [ ]* 18.3 Write integration tests for full assessment flow
    - Test complete candidate flow: login → personality → SJT → scoring → report
    - Test session interruption and resume
    - Test timer expiration and auto-submit
    - Test admin session management and report access
    - _Requirements: 1.1, 1.5, 4.5, 11.6_

  - [ ]* 18.4 Write E2E tests with Playwright
    - Test full candidate journey across browsers
    - Test network interruption simulation
    - Test timer expiration scenarios
    - Test admin dashboard interactions
    - _Requirements: 16.1, 16.2_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. GitHub + Vercel deployment
  - [ ] 20.1 Prepare repository for deployment
    - Verify `.gitignore` exists with proper entries (node_modules, .env, dist, coverage, etc.)
    - Initialize git repository if not already initialized
    - Create initial commit with all project files
    - Create remote repository on GitHub and push
    - Create `README.md` with project overview, setup instructions, and demo credentials

  - [ ] 20.2 Configure Vercel deployment for frontend
    - Create `vercel.json` with build configuration for the frontend SPA
    - Configure build command: `cd packages/frontend && npm run build`
    - Configure output directory: `packages/frontend/dist`
    - Set up SPA rewrites (all routes → index.html)
    - Configure environment variables for API URL

  - [ ] 20.3 Deploy backend as Vercel serverless API
    - Create `api/` directory at project root with serverless function entry points
    - Convert backend routes to Vercel serverless functions (or use a single catch-all function)
    - Configure API route proxying in `vercel.json` (rewrites from `/api/*` to serverless functions)
    - Ensure mock mode works in serverless environment (no PostgreSQL/Redis required for demo)
    - Set up CORS for production domain

  - [ ] 20.4 Push to GitHub and deploy
    - Push all code to GitHub repository
    - Connect repository to Vercel
    - Trigger first deployment
    - Verify production URL works (login, personality test, SJT, results)
    - Share deployment URL

- [ ] 21. Deployment checkpoint - Verify production readiness
  - Ensure production build completes without errors
  - Verify environment variables are properly configured
  - Confirm deployment is accessible at production URL
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–20)
- Unit tests validate specific examples and edge cases
- The scoring engine tasks (8–11) are the algorithmic core and should be thoroughly tested
- Frontend tasks (14) depend on backend APIs being available
- Security features (17) can be implemented in parallel with other tasks
- All UI text should be in Bahasa Indonesia per Requirement 13.6

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.6"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5"] },
    { "id": 5, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 6, "tasks": ["4.2", "5.2", "6.2"] },
    { "id": 7, "tasks": ["4.3", "4.4", "4.5", "5.3"] },
    { "id": 8, "tasks": ["8.1", "8.5", "8.7"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.4", "8.6", "8.8", "8.9"] },
    { "id": 10, "tasks": ["9.1", "10.1", "10.3"] },
    { "id": 11, "tasks": ["9.2", "9.3", "10.2"] },
    { "id": 12, "tasks": ["9.4", "11.1"] },
    { "id": 13, "tasks": ["11.2", "11.3", "11.4"] },
    { "id": 14, "tasks": ["11.5", "13.1"] },
    { "id": 15, "tasks": ["13.2", "13.3", "14.1"] },
    { "id": 16, "tasks": ["14.2", "14.3", "14.4", "14.5"] },
    { "id": 17, "tasks": ["14.6", "16.1"] },
    { "id": 18, "tasks": ["16.2", "16.3", "16.4", "17.1", "17.2"] },
    { "id": 19, "tasks": ["18.1", "18.2"] },
    { "id": 20, "tasks": ["18.3", "18.4"] },
    { "id": 21, "tasks": ["20.1"] },
    { "id": 22, "tasks": ["20.2", "20.3", "20.4"] },
    { "id": 23, "tasks": ["20.5"] }
  ]
}
```
