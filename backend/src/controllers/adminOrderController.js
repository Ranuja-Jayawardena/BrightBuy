const service = require('../services/adminOrderService');
async function list(req,res,next){try{res.json(await service.list(req.query));}catch(e){next(e);}}
async function detail(req,res,next){try{const result=await service.detail(req.params.id);if(!result)return res.status(404).json({error:'not_found',message:'Order not found',statusCode:404});res.json({order:result});}catch(e){next(e);}}
async function status(req,res,next){try{const result=await service.updateStatus(req.params.id,req.body.status);if(!result)return res.status(404).json({error:'not_found',message:'Order not found',statusCode:404});res.json({message:'Order status updated',order:result});}catch(e){next(e);}}
async function delivery(req,res,next){try{const result=await service.updateDelivery(req.params.id,req.body);if(!result)return res.status(404).json({error:'not_found',message:'Delivery not found',statusCode:404});res.json({message:'Delivery status updated',delivery:result});}catch(e){next(e);}}
module.exports={list,detail,status,delivery};
