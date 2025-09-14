# Code Architecture Notes

This document outlines some aspects of the codebase that may be confusing when working with the operation labs and Red vs Blue functionality.

## Navigation Paths

There are two sets of navigation paths used in the application:

- `/red-vs-blue/operations` - Used in some older components
- `/operations/arena` - Used in newer components

When working on navigation, make sure to use the path that aligns with the existing route structure.

## Data Models

The application fetches lab data from multiple sources:

1. The `labs` table
2. The `New_operation` table

This is by design to ensure backward compatibility.

## Team Parameter Handling

Team parameters are handled in different ways across the codebase:

```typescript
// More recent implementation with fallbacks:
let team = teamParam?.toLowerCase() === 'red' ? 'Red' : teamParam?.toLowerCase() === 'blue' ? 'Blue' : null;
if (!team && session && user) {
  if (session.red_user_id === user.id) team = 'Red';
  else if (session.blue_user_id === user.id) team = 'Blue';
}
```

## Empty/Deprecated Files

Some empty or deprecated files exist in the codebase but are kept for reference:

- `src/pages/teams/RedTeamPage.tsx` (empty)
- `src/pages/teams/BlueTeamPage.tsx` (empty)

## .history Directory

The `.history` directory contains old versions of files. These should be ignored when analyzing the current codebase.
