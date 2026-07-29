// Production SLA matrix — minutes per severity per escalation level
const slaMatrix = {
    Critical: { 0: 60,   1: 30,  2: 15,  3: 10  },
    High:     { 0: 240,  1: 120, 2: 60,  3: 30  },
    Medium:   { 0: 480,  1: 240, 2: 120, 3: 60  },
    Low:      { 0: 1440, 1: 720, 2: 360, 3: 120 },
};

/* Development/testing override (swap in locally to trigger escalations fast):
const slaMatrix = {
    Critical: { 0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1 },
    High:     { 0: 2,   1: 2,   2: 2,   3: 2   },
    Medium:   { 0: 3,   1: 3,   2: 3,   3: 3   },
    Low:      { 0: 4,   1: 4,   2: 4,   3: 4   },
};
*/
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