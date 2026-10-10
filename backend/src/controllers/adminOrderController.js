const service = require('../services/adminOrderService');
async function list(req,res,next){try{res.json(await service.list(req.query));}catch(e){next(e);}}
async function detail(req,res,next){try{const result=await service.detail(req.params.id);if(!result)return res.status(404).json({error:'Order not found'});res.json({order:result});}catch(e){next(e);}}
async function status(req,res,next){try{const result=await service.updateStatus(req.params.id,req.body.status);if(!result)return res.status(404).json({error:'Order not found'});res.json({message:'Order status updated',order:result});}catch(e){next(e);}}
async function delivery(req,res,next){try{const result=await service.updateDelivery(req.params.id,req.body);if(!result)return res.status(404).json({error:'Delivery not found'});res.json({message:'Delivery status updated',delivery:result});}catch(e){next(e);}}
module.exports={list,detail,status,delivery};
