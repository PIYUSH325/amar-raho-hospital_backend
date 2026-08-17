const Message = require('../models/Message');

exports.getChatHistory = async(req, res, next)=>{
    try{
        const partnerId = req.params.partnerId;
        const userId = req.user.id;

        const messages = await Message.find({
            $or:[
                {sender: userId, recipient: partnerId},
                {sender: partnerId , recipient : userId}
            ]
        }).sort({createdAt:1});

        res.json({success:true, data: messages});
    } catch(error){
        next(error);
    }
};

