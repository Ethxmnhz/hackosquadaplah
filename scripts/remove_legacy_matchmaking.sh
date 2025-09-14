# Remove legacy matchmaking files
# This script removes files that are part of the old matchmaking system
# and are no longer needed with the new Arena invitation system

# Make sure we're in the right directory
cd "$(dirname "$0")/.."

echo "Removing legacy matchmaking files..."

# Legacy function file that is no longer needed
rm -f src/lib/functions/find_or_create_match.ts
echo "Removed find_or_create_match.ts"

# Legacy matchmaking page that has been replaced by the Arena system
rm -f src/redvsblue/pages/MatchmakingPage.tsx
echo "Removed MatchmakingPage.tsx"

# Check if there are any old backup files to clean up
find src/hooks -name "*backup*" -type f -delete
echo "Removed any backup hook files"

echo "Legacy matchmaking file cleanup complete!"
