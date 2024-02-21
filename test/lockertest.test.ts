import { RedisLocker } from '../src/index.js';
import redis from 'redis';

test('Locking Test',async ()=>{
    // 이 경우, 상호 Locking이 되는지, Locking시 값변경이 이루어지지 않았는지를 검증하라.

    const connectionString = '';
    const redisClients = [
        redis.createClient({
            url:connectionString
        }),redis.createClient({
            url:connectionString
        }),redis.createClient({
            url:connectionString
        })
    ];

    const tester = redisClients.map( c => new RedisLocker(c,'target'));
    expect(tester.map(async u=>{
        const v = await u.locking();
        console.log(v);
    })).toEqual([
        1,2,3
    ]);

});