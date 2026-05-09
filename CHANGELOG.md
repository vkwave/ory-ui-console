# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-09

### Added

- **Dynamic Role Management**: Full CRUD operations for roles backed by Ory Keto relation tuples
  - Create new roles with inline naming
  - Rename roles with atomic migration of all member assignments
  - Delete roles and all associated member tuples in parallel
  - Manage role members (add/remove users by UUID)
  - Visual indicators for unsaved roles (persisted to Keto once first member is added)

- **Role Assignment on User Detail Page**: Assign and revoke roles directly from user profile
  - Dynamic role dropdown populated from Keto
  - Remove assigned roles with single click
  - Real-time sync with role management changes

- **Dedicated Roles Page** (`/dashboard/roles`):
  - Discover and display all existing roles from Keto
  - Create, rename, delete, and manage members for each role
  - Inline role editing with keyboard shortcuts (Enter to save, Escape to cancel)
  - Member list with truncated UUIDs and quick-remove buttons

- **User Roles Component** (`/dashboard/users/[id]`):
  - Displays all roles assigned to a user as removable badges
  - Dropdown selector for unassigned roles ready to assign
  - Helpful messaging when no roles exist or all are assigned

### Changed

- **Keto API Integration**: Fixed write API endpoints to use Keto v0.10+ paths
  - Updated `createRelation` to use `/admin/relation-tuples` (was `/relation-tuples`)
  - Updated `deleteRelation` to use `/admin/relation-tuples` (was `/relation-tuples`)

- **Navigation**: Added "Roles" link under Keto section in sidebar (before Relations and Permissions)

### Technical Details

- Roles are stored in Keto as relation tuples: `namespace=roles, object=<role-name>, relation=member, subject_id=<user-id>`
- All role operations are performed asynchronously with proper error handling and loading states
- Role creation is ephemeral until the first member is added (matches Keto's relation tuple model)
- Renaming roles is atomic: creates new tuples first, then deletes old ones to prevent data loss

### Fixed

- **Keto Write API Endpoints**: Corrected endpoint paths for Ory Keto v0.10+ compatibility (resolves 404 errors on role assignment)

## [1.0.1] - Initial Release

### Added

- Identity management (Kratos) with user listing, detail view, and session management
- OAuth2 client management (Hydra)
- Relation tuple inspection and management (Keto)
- Permission checking interface (Keto)
- Admin authentication and session management
- Dark/light theme support
