import { RedisLocker } from '../src/singleLock.js';
import dotenv from 'dotenv';
dotenv.config();

test('Locking Test',async ()=>{
    // 이 경우, 상호 Locking이 되는지, Locking시 값변경이 이루어지지 않았는지를 검증하라.
    const connectionString = process.env['RedisLink'];
    const redisClients = [
        {
            url:connectionString
        },{
            url:connectionString
        },{
            url:connectionString
        }
    ];

    const tester = redisClients.map( c => new RedisLocker(c,'target'));
    console.time('aa1');

    await tester[0].locking();
    //console.log(tester[0].nowLocking);
    // tester[1].asyncGetLock(()=>{
    //     console.log(tester[1].nowLocking , '>>>><<<<');
    //     console.log('GET!');
    //     tester[1].release().then();
    // });
    // tester[2].asyncGetLock(()=>{
    //     console.log(tester[2].nowLocking , '>>>><<<<');
    //     console.log('GET!2');
    //     //tester[1].release().then();
    // });
    await tester[0].release();
    //console.log(tester[0].nowLocking);
    // expect(tester.map(async u=>{
    //     const v = await u.locking();
    //     return 
    // })).toEqual([
    //     1,2,3
    // ]);
    console.timeEnd('aa1');

    console.time('aa2');
    await tester[0].locking();
    await tester[0].release();

    console.timeEnd('aa2');

});

const sleep = (ms) => {
    return new Promise(resolve=>{
        setTimeout(resolve,ms);
    });
};