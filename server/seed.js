import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot run seed script in production environment!');
    process.exit(1);
  }

  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Conversation.deleteMany({});
  await Message.deleteMany({});

  console.log('Cleared existing data');

  // Create demo users
  const users = await User.create([
    { username: 'alice', email: 'alice@synctalk.dev', password: 'password123', status: 'Working on frontend' },
    { username: 'bob', email: 'bob@synctalk.dev', password: 'password123', status: 'Backend lead' },
    { username: 'carol', email: 'carol@synctalk.dev', password: 'password123', status: 'DevOps' },
    { username: 'dave', email: 'dave@synctalk.dev', password: 'password123', status: 'QA testing' },
  ]);

  console.log('Created users:', users.map((u) => u.username));

  // Create a direct conversation
  const dm = await Conversation.create({
    type: 'direct',
    createdBy: users[0]._id,
    participants: [users[0]._id, users[1]._id],
  });

  // Create a group conversation
  const group = await Conversation.create({
    type: 'group',
    name: 'SyncTalk Dev Team',
    description: 'Main development channel for SyncTalk project',
    createdBy: users[0]._id,
    participants: users.map((u) => u._id),
  });

  console.log('Created conversations');

  // Seed messages for the group
  const groupMessages = [
    { sender: users[0], content: 'Hey team! Sprint planning for this week 🚀' },
    { sender: users[1], content: 'I finished the auth API endpoints yesterday. Ready for review.' },
    { sender: users[2], content: 'Docker setup is done. CI pipeline should be green now.' },
    { sender: users[3], content: 'Found a bug in the login flow — password validation is not working for special chars' },
    { sender: users[0], content: '@bob can you look into the password validation issue?' },
    { sender: users[1], content: 'On it! Will fix the regex in the validator. Should be a quick patch.' },
    { sender: users[2], content: 'Also need to decide on the deployment strategy. Are we going with Render or Railway?' },
    { sender: users[0], content: 'Let\'s go with Railway for now. We can migrate later if needed.' },
    { sender: users[3], content: 'Testing the socket connection — seems stable so far. Will run load tests tomorrow.' },
    { sender: users[1], content: 'Password fix is merged. Carol, can you redeploy?' },
    { sender: users[2], content: 'Deploying now. Give me 5 minutes.' },
    { sender: users[0], content: 'Great progress everyone! Blockers: we still need the AI summarizer integrated.' },
  ];

  for (const msg of groupMessages) {
    await Message.create({
      conversation: group._id,
      sender: msg.sender._id,
      content: msg.content,
      type: 'text',
      readBy: [msg.sender._id],
    });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));
  }

  // Seed DM messages
  const dmMessages = [
    { sender: users[0], content: 'Hey Bob, how is the API coming along?' },
    { sender: users[1], content: 'Going well! Just need to add rate limiting.' },
    { sender: users[0], content: 'Perfect. Let me know if you need help testing.' },
  ];

  for (const msg of dmMessages) {
    await Message.create({
      conversation: dm._id,
      sender: msg.sender._id,
      content: msg.content,
      type: 'text',
      readBy: [msg.sender._id],
    });
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log('Seeded messages');
  console.log('\nDemo accounts:');
  console.log('  alice@synctalk.dev / password123');
  console.log('  bob@synctalk.dev   / password123');
  console.log('  carol@synctalk.dev / password123');
  console.log('  dave@synctalk.dev  / password123');

  await mongoose.disconnect();
  console.log('\nSeed complete!');
};

seed().catch(console.error);
