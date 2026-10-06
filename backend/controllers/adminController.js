import mongoose from 'mongoose'; import User from '../models/User.js'; import GovernmentService from '../models/GovernmentService.js'; import Token from '../models/Token.js'; import Counter from '../models/Counter.js'; import Appointment from '../models/Appointment.js'; import { queueDate } from '../utils/generateToken.js'; import { ApiError } from '../utils/apiError.js';
const ok=(res,message,data)=>res.json({success:true,message,data});
export const dashboard=async(req,res,next)=>{try{const date=queueDate();const [totalCitizens,totalActiveServices,totalTokensToday,waitingTokens,currentlyServingTokens,completedTokens,cancelledTokens,activeCounters,waitAgg,serviceAgg]=await Promise.all([
User.countDocuments({role:'citizen'}),GovernmentService.countDocuments({isActive:true}),Token.countDocuments({date}),Token.countDocuments({date,status:'waiting'}),Token.countDocuments({date,status:'in_service'}),Token.countDocuments({date,status:'completed'}),Token.countDocuments({date,status:'cancelled'}),Counter.countDocuments({isActive:true,$nor:[{status:'offline'}]}),Token.aggregate([{$match:{date,status:'completed',calledAt:{$ne:null},serviceStartedAt:{$ne:null},completedAt:{$ne:null}}},{$group:{_id:null,waiting:{$avg:{$subtract:['$serviceStartedAt','$calledAt']}},service:{$avg:{$subtract:['$completedAt','$serviceStartedAt']}}}}]),Token.aggregate([{$match:{date}},{$group:{_id:'$service',tokens:{$sum:1}}},{$sort:{tokens:-1}},{$limit:5},{$lookup:{from:'governmentservices',localField:'_id',foreignField:'_id',as:'service'}},{$unwind:'$service'},{$project:{_id:0,service:'$service.name',code:'$service.code',tokens:1}}])]);
ok(res,'Dashboard statistics retrieved',{totalCitizens,totalActiveServices,totalTokensToday,waitingTokens,currentlyServingTokens,completedTokens,cancelledTokens,averageWaitingTime:Math.round((waitAgg[0]?.waiting||0)/60000),averageServiceTime:Math.round((waitAgg[0]?.service||0)/60000),activeCounters,busiestServices:serviceAgg});}catch(e){next(e)}};
export const serviceStatistics=async(req,res,next)=>{try{const service=await GovernmentService.findById(req.params.id);if(!service)throw new ApiError('Service not found',404);const [statusCounts,metrics]=await Promise.all([Token.aggregate([{$match:{service:service._id}},{$group:{_id:'$status',count:{$sum:1}}}]),Token.aggregate([{$match:{service:service._id,status:'completed',serviceStartedAt:{$ne:null},completedAt:{$ne:null}}},{$group:{_id:null,averageServiceMs:{$avg:{$subtract:['$completedAt','$serviceStartedAt']}}}}])]);ok(res,'Service statistics retrieved',{service:{id:service._id,name:service.name,code:service.code},statusCounts:Object.fromEntries(statusCounts.map(x=>[x._id,x.count])),averageServiceTime:Math.round((metrics[0]?.averageServiceMs||0)/60000)});}catch(e){next(e)}};

export const users=async(req,res,next)=>{try{const role=['citizen','staff','admin'].includes(req.query.role)?req.query.role:undefined;const query=role?{role}:{};const [items,total]=await Promise.all([User.find(query).select('name email phone role department createdAt').sort({createdAt:-1}).limit(200),User.countDocuments(query)]);ok(res,'Accounts retrieved',{users:items,total});}catch(e){next(e)}};

export const resetStaffPassword=async(req,res,next)=>{try{const password=typeof req.body.password==='string'?req.body.password:'';if(password.length<8)throw new ApiError('Password must contain at least 8 characters',400);const staff=await User.findOne({_id:req.params.id,role:'staff'});if(!staff)throw new ApiError('Staff account not found',404);staff.password=password;await staff.save();ok(res,'Staff password reset successfully',{staff:{_id:staff._id,name:staff.name,email:staff.email}});}catch(e){next(e)}};

export const appointments=async(req,res,next)=>{try{const status=['scheduled','checked_in','completed','cancelled','no_show'].includes(req.query.status)?req.query.status:undefined;const query=status?{status}:{};const [items,total]=await Promise.all([Appointment.find(query).populate('citizen','name email phone').populate('service','name code department').sort({appointmentDate:-1,appointmentTime:1}).limit(200),Appointment.countDocuments(query)]);ok(res,'Appointments retrieved',{appointments:items,total});}catch(e){next(e)}};

export const createServiceWithStaff = async (req, res, next) => {
  let staff;
  try {
    const { service, staff: staffInput } = req.body;
    if (!service || typeof service.name !== 'string' || typeof service.code !== 'string' || typeof service.department !== 'string' || !staffInput?.name || !staffInput?.email || !staffInput?.password) {
      throw new ApiError('Service details and staff name, email, and password are required', 400);
    }
    if (String(staffInput.password).length < 8) throw new ApiError('Staff password must contain at least 8 characters', 400);
    staff = await User.create({ name: staffInput.name, email: staffInput.email, password: staffInput.password, phone: staffInput.phone, role: 'staff', department: service.department });
    const newService = {
      // Keep the value scalar at the API/model boundary. Mongoose will cast
      // this canonical hex string to its ObjectId schema type.
      _id: new mongoose.Types.ObjectId().toHexString(),
      name: service.name,
      code: service.code,
      department: service.department,
      description: service.description,
      requiredDocuments: Array.isArray(service.requiredDocuments) ? service.requiredDocuments : [],
      eligibility: Array.isArray(service.eligibility) ? service.eligibility : [],
      fee: service.fee ?? null,
      operatingHours: service.operatingHours ?? null,
      estimatedProcessingTime: service.estimatedProcessingTime,
      averageServiceTime: service.averageServiceTime,
      averageServiceDuration: service.averageServiceDuration,
      isActive: service.isActive,
      assignedStaff: [staff._id],
    };
    const createdService = await GovernmentService.create(newService);
    const safeStaff = { _id: staff._id, name: staff.name, email: staff.email, role: staff.role, department: staff.department };
    ok(res, 'Service and assigned staff account created', { service: createdService, staff: safeStaff }, 201);
  } catch (e) {
    if (staff?._id) await User.findByIdAndDelete(staff._id).catch(() => {});
    next(e);
  }
};
