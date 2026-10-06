import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import GovernmentService from '../models/GovernmentService.js';
import Appointment from '../models/Appointment.js';
import Token from '../models/Token.js';
import Counter from '../models/Counter.js';
import { generateNextTokenNumber } from '../services/queueService.js';
import { queueDate } from '../utils/generateToken.js';

const runTests = async () => {
  try {
    await connectDatabase();
    console.log('=== Verifying Appointment System & Citizen Details ===\n');

    // 1. Find or create a citizen user with a distinct name
    let citizen = await User.findOne({ role: 'citizen', email: 'mhmd@govflow.com' });
    if (!citizen) {
      citizen = await User.create({
        name: 'Mohammed Al-Mansoor',
        email: 'mhmd@govflow.com',
        password: 'password123',
        role: 'citizen',
        phone: '+91 98765 43210'
      });
    }

    // 2. Find Driving License Renewal service
    const rtoService = await GovernmentService.findOne({ code: 'RTO' });
    if (!rtoService) throw new Error('RTO service not found');

    // 3. Create appointment with user details and applicantName
    const today = new Date();
    const appt = await Appointment.create({
      citizen: citizen._id,
      service: rtoService._id,
      applicantName: citizen.name,
      phone: citizen.phone,
      notes: 'Renewing commercial driver license with updated address proof',
      appointmentDate: today,
      appointmentTime: '11:00'
    });

    console.log('✔ [TEST 1] Appointment created successfully:');
    console.log(`  - Applicant Name: ${appt.applicantName}`);
    console.log(`  - Confirmation Code: ${appt.confirmationCode}`);
    console.log(`  - Service: ${rtoService.name}`);
    console.log(`  - Phone: ${appt.phone}`);
    console.log(`  - Notes: ${appt.notes}\n`);

    if (appt.applicantName !== 'Mohammed Al-Mansoor') {
      throw new Error(`Expected applicantName to be 'Mohammed Al-Mansoor', got '${appt.applicantName}'`);
    }

    // 4. Retrieve appointment with populated citizen details
    const populated = await Appointment.findById(appt._id)
      .populate('service', 'name code department')
      .populate('citizen', 'name email phone');

    console.log('✔ [TEST 2] Populated details for Staff and Citizen portals:');
    console.log(`  - Display Name: ${populated.applicantName || populated.citizen?.name}`);
    console.log(`  - Citizen Email: ${populated.citizen?.email}`);
    console.log(`  - Service Department: ${populated.service?.department}`);
    console.log(`  - Status: ${populated.status}\n`);

    if (populated.citizen?.email !== 'mhmd@govflow.com') {
      throw new Error('Citizen email population mismatch');
    }

    // 5. Test check-in process (generating queue token)
    const token = await generateNextTokenNumber(rtoService, citizen, {
      appointment: appt._id,
      notes: appt.notes
    });

    appt.status = 'checked_in';
    appt.token = token._id;
    await appt.save();

    console.log('✔ [TEST 3] Check-in & Queue Token generation:');
    console.log(`  - Appointment Status: ${appt.status}`);
    console.log(`  - Generated Token Number: ${token.tokenNumber}`);
    console.log(`  - Linked Token ID: ${token._id}\n`);

    if (appt.status !== 'checked_in' || !token.tokenNumber) {
      throw new Error('Check-in failed to generate valid token');
    }

    // Clean up test appointment
    await Token.findByIdAndDelete(token._id);
    await Appointment.findByIdAndDelete(appt._id);

    console.log('🎉 ALL APPOINTMENT SYSTEM VERIFICATION TESTS PASSED!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Appointment verification failed:', err);
    process.exit(1);
  }
};

runTests();
