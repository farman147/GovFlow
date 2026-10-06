import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Token from '../models/Token.js';

async function run() {
  await connectDatabase();

  const allUsers = await User.find({});
  const testUsers = allUsers.filter((u) => u.email && (u.email.startsWith('citizen.test') || u.email.startsWith('test.citizen') || u.email.includes('test')));
  console.log(`Found ${testUsers.length} dummy test users.`);
  const testUserIds = testUsers.map((u) => String(u._id));

  const allAppts = await Appointment.find({});
  let deletedAppts = 0;
  for (const a of allAppts) {
    if (testUserIds.includes(String(a.citizen)) || ['Priya Sharma', 'Mohammed Al-Mansoor', 'Test Citizen'].includes(a.applicantName) || (a.notes && a.notes.includes('commercial driver'))) {
      await Appointment.collection.deleteOne({ _id: a._id });
      deletedAppts += 1;
    }
  }
  console.log(`Deleted ${deletedAppts} dummy test appointments.`);

  const allTokens = await Token.find({});
  let deletedTokens = 0;
  for (const t of allTokens) {
    if (testUserIds.includes(String(t.citizen))) {
      await Token.collection.deleteOne({ _id: t._id });
      deletedTokens += 1;
    }
  }
  console.log(`Deleted ${deletedTokens} dummy test tokens.`);

  let deletedUsers = 0;
  for (const u of testUsers) {
    await User.collection.deleteOne({ _id: u._id });
    deletedUsers += 1;
  }
  console.log(`Deleted ${deletedUsers} dummy test users.`);

  const remaining = await Appointment.find({}).populate('service', 'name department');
  console.log(`Remaining real appointments count: ${remaining.length}`);
  remaining.forEach((a) => {
    console.log(`- ${a.applicantName} | ${a.service?.name} (${a.service?.department}) | ${new Date(a.appointmentDate).toISOString().slice(0, 10)} ${a.appointmentTime} | Status: ${a.status}`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
