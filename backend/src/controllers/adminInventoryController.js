const service = require('../services/adminInventoryService');
async function list(req,res,next){try{res.json(await service.list(req.query));}catch(e){next(e);}}
async function adjust(req,res,next){try{const variant=await service.adjust(req.params.variantId,req.body,req.user.employee_id);if(!variant)return res.status(404).json({error:'Variant not found'});res.json({message:'Stock updated',variant});}catch(e){next(e);}}
async function createEmployee(req,res,next){try{res.status(201).json({employee:await service.createEmployee(req.body)});}catch(e){next(e);}}
async function listEmployees(req,res,next){try{res.json({employees:await service.listEmployees()});}catch(e){next(e);}}
module.exports={list,adjust,createEmployee,listEmployees};
