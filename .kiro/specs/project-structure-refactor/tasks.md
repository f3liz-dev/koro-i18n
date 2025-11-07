# Implementation Plan

- [x] 1. Create new directory structure





  - Create the new directory structure with app/, api/, lib/, config/, and __tests__ directories
  - Set up proper directory hierarchy as defined in the design
  - _Requirements: 1.1, 1.3_

- [x] 2. Update TypeScript configurations





  - [x] 2.1 Update main tsconfig.json with new path mappings


    - Modify baseUrl and paths configuration to match new structure
    - Update include/exclude patterns for new directories
    - _Requirements: 3.4, 2.2_
  
  - [x] 2.2 Update tsconfig.server.json for API and lib directories


    - Configure server build to include src/api and src/lib
    - Update output directory structure
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.3 Update tsconfig.workers.json for workers compatibility


    - Configure workers build to use new API structure
    - Maintain Cloudflare Workers type compatibility
    - _Requirements: 3.1, 3.2_

- [x] 3. Update build configurations





  - [x] 3.1 Modify vite.config.ts for new frontend structure


    - Update root directory to point to src/app
    - Update alias mappings for new path structure
    - Maintain proxy configuration for API routes
    - _Requirements: 3.1, 3.3, 4.4_
  
  - [x] 3.2 Update vite.config.workers.ts for new API structure


    - Update alias mappings to match new structure
    - Ensure workers can access consolidated API code
    - _Requirements: 3.1, 3.2_

- [x] 4. Migrate frontend code





  - [x] 4.1 Move frontend components to src/app/components


    - Relocate all component files from src/frontend/components to src/app/components
    - Maintain component organization and structure
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.2 Move frontend pages to src/app/pages


    - Relocate page components from src/frontend/pages to src/app/pages
    - Update any internal imports within page components
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.3 Move frontend stores and hooks to src/app


    - Relocate stores from src/frontend/stores to src/app/stores
    - Relocate hooks from src/frontend/hooks to src/app/hooks
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.4 Move frontend utilities and styles


    - Relocate src/frontend/utils to src/app/utils (app-specific utilities)
    - Move shared utilities to src/lib/utils
    - Relocate src/frontend/styles to src/app/styles
    - _Requirements: 1.1, 2.1, 2.3_
  
  - [x] 4.5 Update main App.tsx and entry files


    - Move App.tsx to src/app/App.tsx
    - Update index files and HTML templates
    - _Requirements: 1.1, 1.2_

- [x] 5. Migrate API and backend code





  - [x] 5.1 Move backend API routes to src/api/routes


    - Relocate all files from src/backend/api to src/api/routes
    - Maintain route organization and functionality
    - _Requirements: 1.1, 1.2_
  


  - [x] 5.2 Move backend services to src/api/services

    - Relocate src/backend/services to src/api/services
    - Consolidate with any workers services


    - _Requirements: 1.1, 2.3_
  

  - [x] 5.3 Consolidate middleware





    - Move src/backend/middleware to src/api/middleware

    - Merge src/workers/middleware into src/api/middleware
    - Resolve any conflicts between backend and workers middleware
    - _Requirements: 1.1, 2.3_
  
  - [x] 5.4 Move server entry points to src/config

    - Relocate server configuration files to src/config/server.ts
    - Create workers configuration at src/config/workers.ts
    - Update main entry points (index.ts files)
    - _Requirements: 1.1, 1.2_

- [x] 6. Migrate shared code and types





  - [x] 6.1 Move shared types to src/lib/types


    - Relocate all files from src/shared/types to src/lib/types
    - Merge with src/backend/types where appropriate
    - _Requirements: 2.1, 2.4_
  
  - [x] 6.2 Move shared utilities to src/lib/utils


    - Relocate src/shared/utils to src/lib/utils
    - Merge with frontend utils that are actually shared
    - _Requirements: 2.1, 2.3_
  
  - [x] 6.3 Move validation schemas to src/lib/validation


    - Relocate src/shared/validation to src/lib/validation
    - Ensure validation works across all targets
    - _Requirements: 2.1, 2.4_

- [x] 7. Migrate and consolidate tests









  - [x] 7.1 Create new test directory structure


    - Create src/__tests__ with subdirectories for api, app, lib
    - Set up test organization matching new structure
    - _Requirements: 4.2, 4.3_
  
  - [x] 7.2 Move backend tests to src/__tests__/api


    - Relocate src/backend/__tests__ to src/__tests__/api
    - Update test imports to match new structure
    - _Requirements: 4.2, 4.3_
  
  - [x] 7.3 Update test configurations






    - Update vitest.config.ts to work with new test locations
    - Ensure test discovery works with new structure
    - _Requirements: 4.4_

- [x] 8. Update all import statements






  - [x] 8.1 Update frontend component imports

    - Replace all @/frontend imports with @/app imports
    - Update @/shared imports to @/lib imports
    - _Requirements: 2.2, 4.1_
  

  - [x] 8.2 Update API and backend imports

    - Replace @/backend imports with @/api imports
    - Update @/shared imports to @/lib imports
    - _Requirements: 2.2, 4.1_
  

  - [x] 8.3 Update workers imports

    - Update workers code to use new @/api and @/lib imports
    - Ensure workers can access consolidated API code
    - _Requirements: 2.2, 4.1_
  


  - [x] 8.4 Update test imports





    - Update all test files to use new import paths
    - Ensure tests can properly import code under test
    - _Requirements: 2.2, 4.1_

- [x] 9. Update package.json scripts






  - [x] 9.1 Update build scripts for new structure

    - Modify build:frontend script to work with src/app
    - Update any hardcoded paths in build scripts
    - _Requirements: 3.3, 4.4_
  
  - [x] 9.2 Update development scripts


    - Ensure dev:server and dev:frontend work with new structure
    - Update any path references in development scripts
    - _Requirements: 3.3, 4.4_

- [-] 10. Clean up old directories



  - [x] 10.1 Remove old directory structure


    - Delete src/frontend, src/backend, src/workers, src/shared directories
    - Ensure all files have been properly migrated
    - _Requirements: 1.3, 4.2_
  
  - [ ]* 10.2 Verify build and deployment processes
    - Test that all build scripts work with new structure
    - Verify deployment scripts function correctly
    - Test development workflows
    - _Requirements: 3.1, 3.2, 3.3, 4.4_