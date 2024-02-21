export type RedisLockerSetting = {
    // MAX_TIME
    // EXPIRE TIME
    maxTime : number
};

const defaultSetting:RedisLockerSetting= {
    maxTime : 5000
};

export default defaultSetting;