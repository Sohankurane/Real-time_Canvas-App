import asyncio
import websockets
import json
import time
from concurrent.futures import ThreadPoolExecutor

async def simulate_user(user_id, room_id, duration=60):
    uri = f"ws://localhost:8000/ws/{room_id}?token=YOUR_TOKEN"
    async with websockets.connect(uri) as ws:
        start = time.time()
        events_sent = 0
        while time.time() - start < duration:
            # Simulate drawing event
            event = {
                "type": "draw",
                "from": [100 + user_id, 100],
                "to": [100 + user_id, 200],
                "color": "#000000",
                "thickness": 3
            }
            await ws.send(json.dumps(event))
            events_sent += 1
            await asyncio.sleep(0.1)  # 10 events/sec
        return events_sent

async def run_load_test(num_users=10):
    tasks = [simulate_user(i, "test_room") for i in range(num_users)]
    results = await asyncio.gather(*tasks)
    print(f"Total events sent: {sum(results)}")

if __name__ == "__main__":
    asyncio.run(run_load_test(10))
