# Concept

- Redisson 과 병용가능한 Node.js Redis-Lock System
- 기존 Redis는, 록 취득에 실패하면 일정 시간이 지났을때 다시 lock획득을 유도하는 방식으로 동작하고 있습니다.
- 이 라이브러리는, Redis의 Pub/Sub을 통해서 Lock이 해제되었을 때 lock을 취득하게 하는 방식으로 오버헤드를 줄이려 하고 있습니다.
- 또한, 이와 유사한 동작형태를 보이는 redisson과 상호 병용이 가능하게 하여 Java와 같이 사용할 수 있게 하려합니다.
