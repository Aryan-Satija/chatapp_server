const Groups = require('../models/groups.js');
exports.createGroup = async(req, res)=>{
    try{
        const {name, profile, admin, description, participants} = req.body;
        if(!name || !admin || !participants){
            return res.status(400).json({
                success: false,
                message: 'incomplete data to create group'
            })
        }   
        if(participants.size < 3){
            return res.status(400).json({
                success: false,
                message: "There should be atleast 3 participants"
            })
        }    
        const newGroup = await Groups.create({name: name, profile: profile, admin: admin, description: description, participants: participants});
        return res.status(200).json({
            success: true,
            message: "new group has been created",
            newGroup
        })
    } catch(err){
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.updateGroup = async(req, res)=>{
    try{
        const {groupId, name, profile} = req.body;
        if(!groupId){
            return res.status(404).json({
                success: false,
                message: 'group id not found in request'
            })
        }
        const updatedGroup = await Groups.findByIdAndUpdate(groupId, {
            name, 
            profile
        })
        return res.status(200).json({
            success: true,
            message: 'group created successfully',
            updatedGroup
        })
    } catch(err){
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.changeOwnership = async(req, res)=>{
    try{
        const {groupId, newAdminId} = req.body;
        if(!groupId || !newAdminId){
            return res.status(404).json({
                success: false,
                message: 'incomplete request'
            })
        }
        
        const updatedGroup = await Groups.findByIdAndUpdate(groupId, {
            admin: newAdminId
        }, {new: true});

        return res.status(200).json({
            success: true,
            message: 'ownership changed'
        })
    } catch(err){
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}