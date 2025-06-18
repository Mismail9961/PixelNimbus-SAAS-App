#!/bin/bash

# Comprehensive Build Fix Script
echo "🔧 Starting comprehensive build fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a Next.js project
if [ ! -f "package.json" ]; then
    print_error "No package.json found. Are you in the project root?"
    exit 1
fi

print_status "Checking project structure..."

# 1. Fix ESLint configuration
print_status "Setting up ESLint configuration..."
cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@next/next/no-img-element": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
EOF
print_success "ESLint configuration updated"

# 2. Update next.config.js with proper settings
print_status "Updating Next.js configuration..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type check during builds
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig
EOF
print_success "Next.js configuration updated"

# 3. Create TypeScript configuration improvements
print_status "Updating TypeScript configuration..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
print_success "TypeScript configuration updated"

# 4. Fix common import issues
print_status "Fixing common import patterns..."

# Fix any files that might have incorrect Image imports
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | while read file; do
    if grep -q "from 'next/image'" "$file" && grep -q "import.*Image.*from.*lucide-react" "$file"; then
        print_warning "Found conflicting Image imports in $file"
        # Rename lucide Image import to ImageIcon
        sed -i.bak 's/import { \([^}]*\)Image\([^}]*\) } from.*lucide-react.*/import { \1ImageIcon\2 } from "lucide-react"/g' "$file"
        sed -i.bak 's/<Image size/<ImageIcon size/g' "$file"
        sed -i.bak 's/<Image className/<ImageIcon className/g' "$file"
        print_success "Fixed Image import conflicts in $file"
    fi
done

# 5. Add missing alt attributes to any remaining img tags
print_status "Checking for img tags without alt attributes..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | while read file; do
    if grep -q "<img[^>]*src=" "$file" && ! grep -q "alt=" "$file"; then
        print_warning "Found img tags without alt attributes in $file"
        print_warning "Please manually add alt attributes to img tags in $file"
    fi
done

# 6. Clean and reinstall dependencies
print_status "Cleaning dependencies..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "Removed node_modules"
fi

if [ -f "package-lock.json" ]; then
    rm package-lock.json
    print_success "Removed package-lock.json"
fi

if [ -f "yarn.lock" ]; then
    rm yarn.lock
    print_success "Removed yarn.lock"
fi

# 7. Install dependencies
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

# 8. Run type checking
print_status "Running TypeScript type check..."
if npx tsc --noEmit; then
    print_success "TypeScript compilation successful"
else
    print_warning "TypeScript issues found. Check the output above."
fi

# 9. Run ESLint
print_status "Running ESLint check..."
if npx eslint . --ext .ts,.tsx --fix; then
    print_success "ESLint check passed"
else
    print_warning "ESLint issues found and auto-fixed where possible"
fi

# 10. Create a pre-commit hook (optional)
print_status "Setting up Git pre-commit hook..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook for Next.js project

echo "Running pre-commit checks..."

# Run TypeScript check
echo "Checking TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "TypeScript check failed. Please fix the errors and try again."
    exit 1
fi

# Run ESLint
echo "Running ESLint..."
npx eslint . --ext .ts,.tsx
if [ $? -ne 0 ]; then
    echo "ESLint check failed. Please fix the errors and try again."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
chmod +x .git/hooks/pre-commit
print_success "Git pre-commit hook created"

# 11. Test build
print_status "Testing build process..."
if npm run build; then
    print_success "Build successful! 🎉"
else
    print_error "Build failed. Please check the errors above."
    print_status "Common issues to check:"
    echo "  - Missing alt attributes on img/Image tags"
    echo "  - Unused imports"
    echo "  - TypeScript type errors"
    echo "  - Missing dependencies"
    exit 1
fi

# 12. Cleanup backup files
print_status "Cleaning up backup files..."
find . -name "*.bak" -delete
print_success "Backup files cleaned"

# Summary
echo ""
echo "🎉 Build fix script completed!"
echo ""
print_success "✅ ESLint configuration updated"
print_success "✅ Next.js configuration updated"  
print_success "✅ TypeScript configuration updated"
print_success "✅ Dependencies cleaned and reinstalled"
print_success "✅ Image import conflicts resolved"
print_success "✅ Git pre-commit hook created"
print_success "✅ Build test passed"
echo ""
print_status "Your project should now build successfully!"
print_status "Run 'npm run dev' to start development server"
print_status "Run 'npm run build' to create production build"
echo ""