import asyncio
from app.rag.resilience.circuit_breaker import CircuitBreaker, CircuitState

async def mock_provider_call(should_fail=False):
    if should_fail:
        raise Exception("API Rate Limit Exceeded (429)")
    return "Success"

async def test():
    print("--- Testing Circuit Breaker ---")
    breaker = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=2)
    
    # Simulate 3 failures to trip it
    for i in range(3):
        try:
            await breaker.call("openai", mock_provider_call, should_fail=True)
        except Exception as e:
            print(f"Call {i+1} failed: {e}")
            
    print(f"Circuit State: {breaker.state}")
    
    # 4th call should fail fast without hitting the mock_provider_call
    try:
        await breaker.call("openai", mock_provider_call, should_fail=True)
    except Exception as e:
        print(f"Call 4 fast-failed: {e}")
        
    print("Waiting for recovery timeout...")
    await asyncio.sleep(2.1)
    
    print("Attempting half-open recovery...")
    res = await breaker.call("openai", mock_provider_call, should_fail=False)
    print(f"Recovery Call Result: {res}")
    print(f"Final Circuit State: {breaker.state}")

if __name__ == "__main__":
    asyncio.run(test())
