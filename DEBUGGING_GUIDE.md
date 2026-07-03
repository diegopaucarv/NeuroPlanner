# NeuroPlanner Web App - Debugging Guide

## Common Issues & Solutions

### 1. JavaScript/Turbopack Errors

**Error**: `loadChunkByUrlInternal` error in browser console

**Causes**:
- Missing npm dependencies
- Stale browser cache
- Module resolution issues

**Solutions**:
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run dev

# Or clear browser cache and reload (Ctrl+Shift+R on Linux/Windows, Cmd+Shift+R on Mac)

# Check for missing dependencies
npm list lucide-react  # Should show installed version
```

### 2. Dashboard Not Loading

**Error**: Blank white page or 404

**Causes**:
- Server not running
- Wrong route
- Authentication issue

**Solutions**:
```bash
# Check if dev server is running
ps aux | grep "npm run dev"

# Restart server
pkill -f "npm run dev"
npm run dev

# Verify routes exist
ls -la /vercel/share/v0-project/app/dashboard/

# Check authentication middleware
cat /vercel/share/v0-project/middleware.ts
```

### 3. Buttons Not Responding

**Error**: Click events not registering

**Causes**:
- React state not updating
- Event handlers not attached
- Content overlapping clickable elements

**Solutions**:
```bash
# Add debug console.log to verify clicks
# In page.tsx, add to button handler:
console.log("[v0] Button clicked", currentView)

# Check for z-index issues in CSS
grep -r "z-index" /vercel/share/v0-project/app/

# Verify Tailwind classes are applied
# Open DevTools and inspect element
```

### 4. Styling Issues (Colors Not Showing)

**Error**: Black background not rendering, colors muted

**Causes**:
- Tailwind CSS not compiled
- Class names invalid
- CSS not loaded from globals.css

**Solutions**:
```bash
# Check Tailwind CSS config
cat /vercel/share/v0-project/tailwind.config.js

# Verify globals.css is imported in layout
grep -n "globals.css" /vercel/share/v0-project/app/layout.tsx

# Look for conflicting styles
grep -r "bg-white" /vercel/share/v0-project/app/dashboard/
```

### 5. Bottom Navigation Overlaps Content

**Error**: Buttons hidden under bottom nav bar

**Causes**:
- Missing bottom padding on main content
- Fixed positioning issue
- Viewport height miscalculation

**Solution**:
```tsx
// Verify this in page.tsx main element:
<main className="flex-1 overflow-y-auto px-6 py-6 pb-32">
  {/* content */}
</main>
```

### 6. Database API Errors

**Error**: 500 errors from `/api/objectives` or `/api/habits`

**Causes**:
- Database connection not initialized
- Schema mismatch
- Missing environment variables

**Solutions**:
```bash
# Check environment variables
grep -i "neon\|database" /vercel/share/.env.project

# Verify database schema
psql $DATABASE_URL -c "\dt"  # List tables

# Check API route syntax
cat /vercel/share/v0-project/app/api/objectives/route.ts

# Test API manually
curl -X GET http://localhost:3000/api/objectives
```

### 7. Build Errors

**Error**: TypeScript or compilation errors

**Causes**:
- Import path errors
- Type mismatches
- Syntax errors

**Solutions**:
```bash
# Run type check
npm run type-check  # If available, or use TypeScript directly
npx tsc --noEmit

# Check for syntax errors in modified files
node --check /vercel/share/v0-project/app/dashboard/page.tsx

# Look at Next.js build output
npm run build 2>&1 | head -50
```

---

## Debug Output Checklist

When reporting issues, include:

1. **Server Logs**
   ```bash
   tail -100 /tmp/server.log
   ```

2. **Browser Console Error**
   ```
   Open DevTools (F12) → Console tab → screenshot
   ```

3. **Network Requests**
   ```
   DevTools → Network tab → check failing requests
   ```

4. **Current URL**
   ```
   What page are you on when the issue occurs?
   ```

5. **Steps to Reproduce**
   ```
   Clear numbered list of actions before the error
   ```

---

## Performance Profiling

### Check Initial Load Time
```bash
# In browser DevTools → Network tab:
- "Slow 3G" from throttle dropdown
- Reload page
- Check waterfall chart
```

### Check JavaScript Runtime
```bash
# In DevTools → Performance tab:
1. Click Record
2. Interact with app (click tabs, scroll)
3. Click Stop
4. Look for long tasks (>50ms)
```

### Memory Usage
```bash
# In DevTools → Memory tab:
1. Take heap snapshot
2. Look for detached DOM nodes
3. Check for growing memory on navigation
```

---

## Console Logging for Debugging

Add these debug statements to track issues:

```typescript
// In page.tsx component
export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<NavView>('today')
  
  console.log('[v0] Current view:', currentView) // Log view changes
  
  const handleTabClick = (view: NavView) => {
    console.log('[v0] Tab clicked:', view)
    setCurrentView(view)
    console.log('[v0] View state updated to:', view)
  }
  
  // Later remove these logs when debugging is complete
}
```

---

## Quick Restart Procedures

### Full Clean Restart
```bash
# Stop server
pkill -f "npm run dev"

# Clear cache
rm -rf .next node_modules/.cache

# Reinstall dependencies
npm install

# Start fresh
npm run dev
```

### Soft Restart (Keep running)
```bash
# Just restart Next.js without killing
# The dev server watches for file changes automatically
# Just save your file and it recompiles
```

### Database Reset (If Needed)
```bash
# Drop and recreate database
# WARNING: This deletes all data
npm run db:reset  # If this script exists

# Or manually with Neon CLI
vercel env pull
```

---

## Further Assistance

1. **Next.js Docs**: https://nextjs.org/docs
2. **Tailwind CSS**: https://tailwindcss.com
3. **Lucide Icons**: https://lucide.dev
4. **React Hooks**: https://react.dev/reference/react

Remember: Always check the server logs first, then browser console, then Network tab.
