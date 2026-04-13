const slaMatrix = {
    Critical : {0:60,1:30,2:15,3:10},
    High:{0:240,1:120,2:60,3:30},
    Medium:{0:480,1:240,2:120,3:60},
    Low:{0:1440,1:720,2:360,3:120}
};
export const calculateSLA = (severity,escalationLevel)=>
    {
        if(!slaMatrix[severity]){
            throw new Error("Invalid severity value");
        }
     const level = escalationLevel > 3 ? 3 : escalationLevel;
     const minutes= slaMatrix[severity][level];
    return new Date(Date.now()+minutes*60*1000);

};

export default calculateSLA;