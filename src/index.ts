import type { RedisClientOptions,RedisClientType } from 'redis';
import defaultSetting from './settings/lockersetting.js';
import redis from 'redis';
import type { RedisLockerSetting } from './settings/lockersetting.js';
import type {RedisClusterLockerSetting} from './types/clusterlockerSetting.js';
import { RedisLocker } from './singleLock.js';

///>>>> 분산환경하 Redis Lock의 취득
///>>>> 1. 현재 시간을 밀리 초 단위로 가져옵니다.
// 2. 모든 인스턴스에서 동일한 키 이름과 임의의 값을 사용하여 모든 N 인스턴스에서 순차적으로 잠금을 획득하려고 시도합니다.
// > 2단계에서 각 인스턴스에 잠금을 설정할 때 클라이언트는 잠금을 획득하기 위해 총 잠금 자동 해제 시간에 비해 작은 제한 시간을 사용합니다. 
// > 예를 들어 자동 해제 시간이 10초인 경우 제한 시간은 ~ 5~50밀리초 범위일 수 있습니다. 
// > 이렇게 하면 클라이언트가 다운된 Redis 노드와 통신하려고 오랫동안 차단되는 것을 방지할 수 있습니다.
// > 인스턴스를 사용할 수 없는 경우 최대한 빨리 다음 인스턴스와 통신을 시도해야 합니다.
// 3. 클라이언트는 1단계에서 얻은 타임스탬프를 현재 시간에서 빼서 잠금을 획득하는 데 경과된 시간을 계산합니다. 
// > ⚠️ 클라이언트가 대부분의 인스턴스(최소 3개)에서 잠금을 획득할 수 있었던 경우에만 해당됩니다.  
// > ❗잠금을 획득하는데 소요된 총 시간이 잠금 유효 시간보다 작을 경우 잠금을 획득한 것으로 간주됩니다.
// 4. 잠금이 획득된 경우 유효 시간은 3단계에서 계산된 대로 초기 유효 시간에서 경과 시간을 뺀 것으로 간주됩니다.
// 5. 클라이언트가 어떤 이유로 잠금 획득에 실패한 경우(N/2+1 인스턴스를 잠글 수 없거나 유효 시간이 음수인 경우) 모든 인스턴스의 잠금을 해제하려고 시도합니다 (그렇지 않다고 생각되는 인스턴스도 포함)


export class RedisClusterLock {
    // 다중 Lock 관리시에는 lockResourceName에 따른 락을 관리해야 한다.
    #redisLockers:RedisLocker[] = null;
    #clusterSetting :RedisClusterLockerSetting = null;
    constructor( 
        originSettings : RedisClientOptions[],
        targetName : string,
        setting? : RedisClusterLockerSetting,        
    )
    {
        const lockResourceName = targetName??'_target';
        this.#clusterSetting = setting;
        this.#redisLockers = originSettings.map(s=>new RedisLocker(s,lockResourceName,setting.redisConnectionSetting));
    }
    // 클러스터링 Lock에 성공시 true, 실패시 false.
    // N/2 + 1의 다수합의 알고리즘임에 유의.
    //  ❗잠금을 획득하는데 소요된 총 시간이 잠금 유효 시간보다 작을 경우 잠금을 획득한 것으로 간주됩니다.
    //
    setLock : (lockName?:string)=>Promise<boolean> =  async(lockName?:string)=>{
        const nowMillisecond = Date.now();
        const atLeast = Math.floor(this.#redisLockers.length/2); // 최소 합의 수
        const limitSecond = this.#clusterSetting.redisConnectionSetting.expireTime < this.#clusterSetting.maxExpireTime ? this.#clusterSetting.redisConnectionSetting.expireTime : this.#clusterSetting.maxExpireTime;
        let acceptedClient = 0;
        const failedConnection = [];
        if(this.#clusterSetting.experimentParallelQuery === true)
        {
            const actions:Promise<boolean>[] = this.#redisLockers.map(x=>{
                return new Promise<boolean>(
                    (res,rej)=>{
                        try{
                            x.locking().then((r)=>{
                                if(r===false)
                                    failedConnection.push(x);
                                res(r);
                            });
                        } catch(e) {
                            rej(e);
                        }
                    }
                );
            });
            const result = await Promise.all(actions);
            acceptedClient = result.reduce((acc,curr)=>curr === true ? acc++ : acc,0);
        }
        else
        {
            for(const nowRedisConnection of this.#redisLockers)
            {
                // O(N)?
                if(await nowRedisConnection.locking() === true)
                {
                    acceptedClient ++;
                }
                else 
                {
                    failedConnection.push(nowRedisConnection);
                }
            }
        }
        if(acceptedClient > atLeast) 
        {
            // ACCEPTED !
            
            // 실패한 연결에 대한 처리 -> redission 따라가기.
            Promise.all(
                failedConnection.map(x=>new Promise((res,rej) => {
                    try{
                        x.locking().then((r)=>{
                            res(r);
                        });
                    }catch(e){
                        rej(e);
                    }
                }))
            );
            return true;
        } 
        else 
        {
            // FAILED...
            if(this.#clusterSetting.experimentParallelQuery === true)
            {
                const revertActions = this.#redisLockers.map(x=> new Promise(
                    (res,rej)=>{
                        x.release();
                    }
                ));
                Promise.all(revertActions);
            }
            else
            {
                for(const nowRedisConnection of this.#redisLockers)
                {
                    await nowRedisConnection.release();
                }
            }
            throw new Error('set Multiple locks fail.');
        }
    };
}

/**
 * 실패 시 재시도
클라이언트가 잠금을 획득할 수 없는 경우 동시에 동일한 리소스에 대한 잠금을 획득하려는 여러 클라이언트의 비동기화를 시도하기 위해 무작위 지연 후에 다시 시도해야 합니다(이로 인해 아무도 잠금을 해제할 수 없는 분할 브레인 상태가 발생할 수 있음). 또한 클라이언트가 대부분의 Redis 인스턴스에서 잠금을 획득하려고 시도하는 속도가 빠를수록 분할 브레인 조건(및 재시도 필요성)에 대한 창이 작아지므로 이상적으로 클라이언트는 N 인스턴스에 SET 명령을 보내려고 시도해야 합니다. 동시에 멀티플렉싱을 사용합니다.

대부분의 잠금을 획득하지 못한 클라이언트가 (부분적으로) 획득한 잠금을 최대한 빨리 해제하여 잠금을 다시 획득하기 위해 키 만료를 기다릴 필요가 없도록 하는 것이 얼마나 중요한지 강조할 가치가 있습니다. 그러나 네트워크 분할이 발생하고 클라이언트가 더 이상 Redis 인스턴스와 통신할 수 없는 경우 키 만료를 기다리기 때문에 가용성 페널티를 지불해야 합니다.
 
// 우리의 개선점은, '여러 클라이언트의 비동기화를 시도하기 위해 무작위 지연 후에 다시 시도해야 합니다' 부분임에 유의.
// a. Pub/Sub 기능의 
*/