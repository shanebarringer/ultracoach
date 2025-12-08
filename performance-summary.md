# UltraCoach Test Performance Summary

## Sharded Execution Results

- **Total Shards**: 4
- **Parallel Workers**: 3 per shard
- **Test Distribution**: Tests are grouped by database mutation patterns to prevent conflicts:
  - Shard 1: Authentication tests (isolated session operations)
  - Shard 2: Read-only dashboard and UI tests
  - Shard 3: Coach-runner relationship tests (uses test-specific data)
  - Shard 4: Workout and training plan CRUD tests

## Key Metrics

| Test Suite         | Tests | Avg Duration | Status |
| ------------------ | ----- | ------------ | ------ |
| Authentication     | 8     | ~45s         | Stable |
| Dashboard (Coach)  | 5     | ~30s         | Stable |
| Dashboard (Runner) | 5     | ~30s         | Stable |
| Relationships      | 6     | ~60s         | Stable |
| Workouts           | 4     | ~40s         | Stable |

- **Total Test Count**: ~28 stable core tests
- **Average CI Run Time**: ~3-4 minutes with sharding
- **Success Rate**: >95% on stable test suite

## Test Distribution Strategy

Database safety is achieved through:

1. **Isolated auth sessions**: Each test file uses dedicated storageState
2. **Test-specific data**: Relationship tests use seeded test accounts
3. **Read-before-write guards**: CRUD tests verify state before mutations
4. **Shard isolation**: No cross-shard database dependencies

## MCP Features Available

- Network interception for API testing
- Visual comparisons for UI regression detection
- Performance metrics collection
- Sharded reporting and analysis

---

Generated with Playwright MCP integration
