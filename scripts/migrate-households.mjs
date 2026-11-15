import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'CareNest';

const DEMO_HOUSEHOLD_ID = 'household_demo_meera_01';

async function migrate() {
  console.log('🔄 Starting CareNest AI Multi-User & Household Data Isolation Migration...');

  if (!uri) {
    console.log('ℹ️ MONGODB_URI not set. Skipping live DB migration (mock store handles automatically).');
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log(`📡 Connected to MongoDB: ${dbName}`);
    const db = client.db(dbName);

    // 1. Ensure Demo Household exists
    await db.collection('households').updateOne(
      { _id: DEMO_HOUSEHOLD_ID },
      {
        $setOnInsert: {
          _id: DEMO_HOUSEHOLD_ID,
          name: 'Meera Sharma Family Care (Demo)',
          ownerId: 'user_rahul_03',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    console.log('  ✓ Demo household verified:', DEMO_HOUSEHOLD_ID);

    // 2. Ensure Demo Memberships exist
    const demoMemberships = [
      {
        _id: 'membership_hh_rahul_03',
        userId: 'user_rahul_03',
        householdId: DEMO_HOUSEHOLD_ID,
        role: 'OWNER',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'membership_hh_sunita_02',
        userId: 'user_sunita_02',
        householdId: DEMO_HOUSEHOLD_ID,
        role: 'CAREGIVER',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'membership_hh_meera_01',
        userId: 'user_meera_01',
        householdId: DEMO_HOUSEHOLD_ID,
        role: 'SENIOR',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    for (const m of demoMemberships) {
      await db.collection('memberships').updateOne(
        { _id: m._id },
        { $setOnInsert: m },
        { upsert: true }
      );
    }
    console.log('  ✓ Demo memberships verified in "memberships"');

    // 3. Tag all existing records missing householdId with DEMO_HOUSEHOLD_ID
    const collectionsToMigrate = [
      'careProfiles',
      'careMemberships',
      'medications',
      'doseEvents',
      'appointments',
      'healthLogs',
      'caregiverNotes',
      'notifications',
      'auditLogs',
    ];

    for (const colName of collectionsToMigrate) {
      const result = await db.collection(colName).updateMany(
        { householdId: { $exists: false } },
        { $set: { householdId: DEMO_HOUSEHOLD_ID } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✓ Updated ${result.modifiedCount} records in '${colName}' with householdId`);
      }
    }

    // 4. Create essential indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('households').createIndex({ ownerId: 1 });
    await db.collection('memberships').createIndex({ userId: 1, householdId: 1 }, { unique: true });
    await db.collection('memberships').createIndex({ householdId: 1 });
    await db.collection('sessions').createIndex({ sessionTokenHash: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('otpVerifications').createIndex({ email: 1, createdAt: -1 });
    await db.collection('otpVerifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('medications').createIndex({ householdId: 1, status: 1 });
    await db.collection('doseEvents').createIndex({ doseKey: 1 }, { unique: true });
    await db.collection('doseEvents').createIndex({ householdId: 1 });
    await db.collection('careProfiles').createIndex({ householdId: 1 });

    console.log('  ✓ Multi-tenant and household indexes created successfully.');
    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
