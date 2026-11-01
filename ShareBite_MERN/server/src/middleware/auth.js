import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {env} from '../config/env.js';
export async function authenticate(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({success:false,message:'Authentication required.'});const p=jwt.verify(h.slice(7),env.accessSecret,{issuer:'sharebite'});const user=await User.findById(p.sub).select('_id fullName restaurantName email role accountStatus city address');if(!user||user.accountStatus!=='ACTIVE')return res.status(401).json({success:false,message:'Account unavailable.'});req.user=user;next();}catch{return res.status(401).json({success:false,message:'Invalid or expired access token.'});}}
export const authorize=(...roles)=>(req,res,next)=>req.user&&roles.includes(req.user.role)?next():res.status(403).json({success:false,message:'Permission denied.'});
