import 'dotenv/config';
import { connectDatabase } from './config/db.js';
import User from './models/User.js';
import GovernmentService from './models/GovernmentService.js';
import Counter from './models/Counter.js';

const serviceDefinitions = [
  {
    name: 'Driving License Renewal',
    code: 'RTO',
    department: 'Transport',
    description: 'Official renewal of expired or expiring driving licenses for motor vehicles and commercial drivers.',
    requiredDocuments: [
      'Existing Driving License',
      'Proof of Identity (Aadhaar / Passport / Voter ID)',
      'Proof of Address',
      'Recent Passport Size Photographs',
      'Form 9 & Medical Fitness Certificate (Form 1-A if age > 40)'
    ],
    eligibility: [
      'Hold an expired or expiring valid driving license',
      'Applicant age must be 18 years or older',
      'Medical fitness certification if applicant is over 40 years old'
    ],
    fee: '₹450 ($25.00) standard fee, ₹200 for late renewal within grace period',
    operatingHours: 'Monday - Friday: 09:00 AM - 05:00 PM, Saturday: 09:00 AM - 01:00 PM',
    estimatedProcessingTime: 15,
    averageServiceTime: 15,
    averageServiceDuration: 15,
  },
  {
    name: 'Vehicle Registration',
    code: 'VEH',
    department: 'Transport',
    description: 'Registration of newly purchased vehicles, ownership transfer, and issuance of Registration Certificate (RC).',
    requiredDocuments: [
      'Form 20 (Application for Registration)',
      'Sale Certificate (Form 21 from dealer)',
      'Valid Motor Insurance Certificate',
      'Road Worthiness Certificate (Form 22)',
      'Proof of Address and Identity'
    ],
    eligibility: [
      'Vehicle owner or legal representative with Power of Attorney',
      'Vehicle must have valid temporary registration or certificate of sale'
    ],
    fee: '₹600 ($35.00) for standard vehicle registration + applicable state road tax',
    operatingHours: 'Monday - Friday: 09:00 AM - 05:00 PM',
    estimatedProcessingTime: 12,
    averageServiceTime: 12,
    averageServiceDuration: 12,
  },
  {
    name: 'Birth Certificate',
    code: 'BIRTH',
    department: 'Civil Registration',
    description: 'Official registration and issuance of certified birth certificates for citizens and new births.',
    requiredDocuments: [
      'Hospital Discharge / Birth Report Slip',
      'Identity Proof of Parents (Aadhaar / Voter ID / Passport)',
      'Parents\' Marriage Certificate',
      'Proof of Residence / Address'
    ],
    eligibility: [
      'Parents, legal guardian, or individual seeking their own birth record',
      'Birth occurred within the municipal jurisdiction'
    ],
    fee: 'Free within 21 days of birth; ₹50 ($5.00) for delayed registration',
    operatingHours: 'Monday - Friday: 09:00 AM - 04:00 PM',
    estimatedProcessingTime: 8,
    averageServiceTime: 8,
    averageServiceDuration: 8,
  },
  {
    name: 'Income Certificate',
    code: 'INC',
    department: 'Revenue',
    description: 'Issuance of official household income certificate for educational concessions, scholarships, and state welfare schemes.',
    requiredDocuments: [
      'Salary Slip / Employer Certificate or Form 16',
      'Income Affidavit on Stamp Paper',
      'Ration Card or Family Card',
      'Identity Proof & Address Proof'
    ],
    eligibility: [
      'Resident citizen within the state / administrative revenue circle',
      'Verifiable household earnings documents'
    ],
    fee: '₹30 ($3.00) processing and documentation fee',
    operatingHours: 'Monday - Friday: 10:00 AM - 05:00 PM',
    estimatedProcessingTime: 10,
    averageServiceTime: 10,
    averageServiceDuration: 10,
  },
  {
    name: 'Land Record Request',
    code: 'LAND',
    department: 'Revenue',
    description: 'Official verification, inspection, and issuance of certified land ownership records, patta, and survey extracts.',
    requiredDocuments: [
      'Recent Property Tax Assessment Receipt',
      'Registered Sale Deed / Title Deed copy',
      'Survey Number / Khata Details',
      'Applicant Identity Proof'
    ],
    eligibility: [
      'Registered property owner or authorized legal heir',
      'Authorized attorney with registered POA'
    ],
    fee: '₹100 ($10.00) per certified survey extract',
    operatingHours: 'Monday - Friday: 10:00 AM - 05:00 PM',
    estimatedProcessingTime: 10,
    averageServiceTime: 10,
    averageServiceDuration: 10,
  },
];

const upsertUser = async ({ email, name, role, department, password }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({ email, name, role, department, password });
  } else {
    user.name = name;
    user.role = role;
    user.department = department;
    user.password = password;
  }

  await user.save();
  return user;
};

const run = async () => {
  try {
    await connectDatabase();

    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
    const staffPassword = process.env.SEED_STAFF_PASSWORD || adminPassword;

    await GovernmentService.collection.deleteMany({ code: 'DLR' });
    await Counter.collection.deleteMany({ counterNumber: { $in: ['C-06', 'C-99'] } });

    await upsertUser({
      email: 'admin@govflow.com',
      name: 'GovFlow Administrator',
      role: 'admin',
      department: 'Administration',
      password: adminPassword,
    });

    const createdServices = [];

    for (const def of serviceDefinitions) {
      const service = await GovernmentService.findOneAndUpdate(
        { code: def.code },
        {
          $set: {
            name: def.name,
            code: def.code,
            department: def.department,
            description: def.description,
            requiredDocuments: def.requiredDocuments,
            eligibility: def.eligibility,
            fee: def.fee,
            operatingHours: def.operatingHours,
            estimatedProcessingTime: def.estimatedProcessingTime,
            averageServiceTime: def.averageServiceTime,
            averageServiceDuration: def.averageServiceDuration,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const email = `${def.code.toLowerCase()}.staff@govflow.com`;
      const user = await upsertUser({
        email,
        name: `${def.department} Staff`,
        role: 'staff',
        department: def.department,
        password: staffPassword,
      });

      createdServices.push({ service, user, department: def.department, code: def.code });
    }

    for (let i = 0; i < createdServices.length; i += 1) {
      const item = createdServices[i];
      const counterNumber = `C-${String(i + 1).padStart(2, '0')}`;

      const counter = await Counter.findOneAndUpdate(
        { counterNumber },
        {
          $set: {
            name: `${item.department} Counter ${i + 1}`,
            counterNumber,
            department: item.department,
            services: [item.service._id],
            assignedStaff: [item.user._id],
            status: 'available',
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Link counter to service
      await GovernmentService.findByIdAndUpdate(item.service._id, {
        $addToSet: { availableCounters: counter._id }
      });
    }

    console.log('Seed complete. Admin: admin@govflow.com');
    console.log('Transport, Civil Registration, and Revenue staff now have valid assigned counters.');
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

run();


