const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AiSettings = require('../models/AiSettings');
const { buildHospitalSystemInstruction } = require('../ai/prompts/systemPrompts');
const { agentChat } = require('../ai');

async function testAiSettings() {
  console.log('🧪 Starting AI Assistant Database Settings & Dynamic Directives Test...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Fetch or initialize settings
    let settings = await AiSettings.findOne();
    if (!settings) {
      console.log('⚙️ Initializing default AiSettings in MongoDB...');
      settings = await AiSettings.create({});
    }
    console.log('✅ Successfully loaded settings from MongoDB:', {
      hospitalName: settings.hospitalName,
      address: settings.address,
      emergencyPhone: settings.emergencyPhone,
      supportEmail: settings.supportEmail,
      operatingHours: settings.operatingHours,
      botPersonality: settings.botPersonality
    });

    // 2. Test system instruction prompt builder with defaults
    const defaultInstruction = buildHospitalSystemInstruction(settings);
    if (!defaultInstruction.includes(settings.hospitalName) || !defaultInstruction.includes(settings.emergencyPhone)) {
      throw new Error('Default prompt does not contain expected hospitalName or emergencyPhone');
    }
    console.log('✅ System instruction builder successfully incorporates database settings.');

    // 3. Test dynamic customization
    const originalHours = settings.operatingHours;
    const testHours = 'Monday to Sunday, 08:00 AM to 08:00 PM (24/7 Trauma)';
    const testCustomDirectives = 'SPECIAL ANNOUNCEMENT: Free health checkup camp this Friday for senior citizens.';

    settings.operatingHours = testHours;
    settings.customInstructions = testCustomDirectives;
    await settings.save();
    console.log('✅ Updated settings in MongoDB with new operating hours and custom directive.');

    // 4. Verify prompt builder with updated settings
    const updatedInstruction = buildHospitalSystemInstruction(settings);
    if (!updatedInstruction.includes(testHours)) {
      throw new Error('Updated instruction missing test operating hours!');
    }
    if (!updatedInstruction.includes(testCustomDirectives)) {
      throw new Error('Updated instruction missing test custom directives!');
    }
    console.log('✅ buildHospitalSystemInstruction accurately reflects updated MongoDB fields.');

    // 5. Test Live AI response reflecting updated hospital hours/custom announcement
    console.log('\n🤖 Testing Live AI Chat with dynamic MongoDB settings...');
    const response = await agentChat('What are the hospital operating timings and are there any special announcements today?');
    console.log('Bot Response:\n', response.reply);

    // 6. Restore original settings
    settings.operatingHours = originalHours;
    settings.customInstructions = '';
    await settings.save();
    console.log('\n✅ Restored original settings in MongoDB.');

    console.log('\n🎉 ALL AI SETTINGS DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testAiSettings();
