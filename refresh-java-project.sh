#!/bin/bash

echo "🔄 Refreshing Java project..."

# Navigate to backend directory
cd backend

# Clean and build the project
echo "🧹 Cleaning and building project..."
./gradlew clean build --refresh-dependencies

# Go back to project root
cd ..

echo "✅ Java project refreshed successfully!"
echo ""
echo "📝 Next steps in VS Code:"
echo "1. Open Command Palette (Cmd+Shift+P)"
echo "2. Run: Java: Clean Workspace"
echo "3. Run: Java: Reload Projects"
echo "4. Run: Developer: Reload Window"
echo ""
echo "This should resolve any build path issues." 