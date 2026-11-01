import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},sessionId:{type:String,required:true,unique:true},tokenHash:{type:String,required:true},expiresAt:{type:Date,required:true,index:{expires:0}},revokedAt:{type:Date,default:null}},{timestamps:true});
export default mongoose.model('RefreshSession',schema);
