# React useEffect Best Practices: Preventing Re-renders

## Common Causes of Infinite Re-renders

### 1. Missing or Incorrect Dependencies

```javascript
// ❌ BAD: Missing dependencies
useEffect(() => {
  fetchData()
}, []) // fetchData might depend on state/props

// ✅ GOOD: Include all dependencies
useEffect(() => {
  fetchData()
}, [searchTerm, userId]) // All dependencies declared
```

### 2. Object/Function Dependencies

```javascript
// ❌ BAD: Object created on every render
const options = { serverUrl, roomId }
useEffect(() => {
  connect(options)
}, [options]) // options changes every render

// ✅ GOOD: Create object inside effect
useEffect(() => {
  const options = { serverUrl, roomId }
  connect(options)
}, [serverUrl, roomId]) // Only primitive dependencies
```

### 3. Functions as Dependencies

```javascript
// ❌ BAD: Function recreated every render
const fetchData = () => { /* fetch logic */ };
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData changes every render

// ✅ GOOD: Move function inside effect
useEffect(() => {
  const fetchData = () => { /* fetch logic */ };
  fetchData();
}, [dependency1, dependency2]);

// ✅ ALTERNATIVE: Use useCallback
const fetchData = useCallback(() => {
  /* fetch logic */
}, [dependency1, dependency2]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

## State Update Patterns

### 1. Use Updater Functions

```javascript
// ❌ BAD: Depends on current state
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1) // Depends on count
  }, 1000)
  return () => clearInterval(id)
}, [count]) // Re-creates interval every time

// ✅ GOOD: Use updater function
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1) // No dependency on count
  }, 1000)
  return () => clearInterval(id)
}, []) // Empty dependencies - runs once
```

### 2. Separate Concerns

```javascript
// ✅ GOOD: Separate effects for different concerns
function ChatRoom({ roomId }) {
  // Effect for logging visit
  useEffect(() => {
    logVisit(roomId)
  }, [roomId])

  // Effect for managing connection
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
}
```

## Debugging Re-render Issues

### 1. Console Log Dependencies

```javascript
useEffect(() => {
  // Your effect logic
}, [serverUrl, roomId])

// Debug: Log dependencies to see what changes
console.log([serverUrl, roomId])
```

### 2. Compare Dependencies Manually

```javascript
// In browser console
Object.is(temp1[0], temp2[0]) // Compare first dependency
Object.is(temp1[1], temp2[1]) // Compare second dependency
```

## Best Practices Summary

1. **Always include all dependencies** - Don't suppress the linter
2. **Use primitive values as dependencies** when possible
3. **Create objects/functions inside effects** if they're only used there
4. **Use updater functions** to avoid state dependencies
5. **Separate effects** for different concerns
6. **Move static values outside components** if they don't change
7. **Use useCallback/useMemo** sparingly and only when needed for performance

## Common Anti-patterns to Avoid

```javascript
// ❌ Never suppress the linter
useEffect(() => {
  // ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ❌ Never call functions during render
return <button onClick={handleClick()}>Click</button> // Wrong
return <button onClick={handleClick}>Click</button>   // Correct

// ❌ Never update state unconditionally during render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Causes infinite re-renders
  return <div>{count}</div>;
}
```

This documentation is based on official React guidelines for preventing re-renders and managing useEffect dependencies effectively.
