export type RedisLockerSetting = {
    // MAX_TIME
    // EXPIRE TIME
    maxTime : number
    expireTime:number
};

const defaultSetting:RedisLockerSetting= {
    maxTime : 5000,
    expireTime : 3000
};

export default defaultSetting;