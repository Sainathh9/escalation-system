import jwt from 'jsonwebtoken';



export const authMiddleWare = (req,res,next)=>{
   try{

    const authHeader = req.headers.authorization;
    if(!authHeader){
       return res.status(401).json({error:"No token provided"}); //authHeader.split would crash if we wont return this
    }
    if(!authHeader.startsWith("Bearer ")){ //spacing after Bearer matters
        return res.status(401).json({error:"Invalid header"});
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    req.user=decoded;
    next();
    
   }catch(err){
    console.log(err);
    res.status(401).json({error:"Unknown Error Occured"});
   }
    };

export default authMiddleWare;
