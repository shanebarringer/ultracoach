# Playwright CI Best Practices

## Key Takeaways from Context7 Documentation

### 1. Use Docker Containers for Consistent Environment
```yaml
container:
  image: mcr.microsoft.com/playwright:v1.55.0-noble
  options: --user 1001
```

### 2. Authentication Setup Pattern
- Use a dedicated auth setup project that runs before all other tests
- Save authentication state to a file for reuse
- Configure test projects to depend on the setup project

### 3. Optimal CI Timeouts
- Job timeout: 60 minutes maximum
- Test timeout: 120s for CI compilation delays
- Action timeout: 30s for CI
- Navigation timeout: 60s for CI

### 4. Reduce Workers for CI Stability
- CI: 1-2 workers (not 3+) to prevent resource contention
- Local: 1 worker for debugging

### 5. Reporter Configuration
```javascript
reporter: process.env.CI ? [['github'], ['html'], ['blob']] : 'html'
```

### 6. Essential CI Steps
1. Use Docker container with pre-installed browsers
2. Run authentication setup once
3. Use saved storage state for all authenticated tests
4. Upload reports as artifacts
5. Keep trace collection minimal (`on-first-retry`)

### 7. Performance Optimizations
- Install only chromium for CI (not all browsers)
- Use `--with-deps` for system dependencies
- Enable blob reporting for result merging
- Disable full parallelization within test files for database safety