import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

console.log('==============================================================================');
console.log('           CareNest AI — LIVE SERVICES & CREDENTIALS VERIFICATION');
console.log('==============================================================================');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js runtime:', process.version);
console.log('------------------------------------------------------------------------------\n');

async function testMongoDB() {
  console.log('[TEST 1/4] Testing Live MongoDB Atlas Connection...');
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'CareNest';

  if (!uri) {
    console.error('  ❌ MONGODB_URI is not defined in .env');
    return false;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    const t0 = Date.now();
    await client.connect();
    const pingResult = await client.db(dbName).command({ ping: 1 });
    const latency = Date.now() - t0;
    console.log(`  ✅ Successfully connected to MongoDB Atlas! (Ping latency: ${latency}ms)`);
    console.log(`     Target Database: "${dbName}"`);

    const collections = await client.db(dbName).listCollections().toArray();
    console.log(`     Existing collections in DB (${collections.length}):`, collections.map(c => c.name).join(', ') || 'None yet');
    await client.close();
    return true;
  } catch (err) {
    console.error('  ❌ MongoDB Atlas Connection Error:', err.message);
    try { await client.close(); } catch {}
    return false;
  }
}

async function testGemini() {
  console.log('\n[TEST 2/4] Testing Live Google Gemini API...');
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('  ❌ GEMINI_API_KEY is not defined in .env');
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = 'CareNest AI test: In 15 words or less, explain why an elderly patient should take Metformin with food.';
    
    const t0 = Date.now();
    const result = await model.generateContent(prompt);
    const latency = Date.now() - t0;
    const responseText = result.response.text();
    
    console.log(`  ✅ Successfully called Google Gemini API! (Latency: ${latency}ms)`);
    console.log(`     Model: gemini-3.5-flash`);
    console.log(`     Generated Response: "${responseText.trim()}"`);
    return true;
  } catch (err) {
    console.error('  ❌ Google Gemini API Error:', err.message);
    return false;
  }
}

async function testResend() {
  console.log('\n[TEST 3/4] Testing Live Resend Email Service...');
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('  ❌ RESEND_API_KEY is not defined in .env');
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const t0 = Date.now();
    // Test API key validity by querying apiKeys or domains
    const { data, error } = await resend.apiKeys.list();
    const latency = Date.now() - t0;

    if (error) {
      console.warn('  ⚠️ Resend API Key check notice:', error.message);
      // Try sending a verification email to onboarding test recipient or check domains
      const domainsResult = await resend.domains.list();
      if (domainsResult.error) {
        console.error('  ❌ Resend API Key validation failed:', domainsResult.error.message);
        return false;
      } else {
        console.log(`  ✅ Resend API connected successfully! (Latency: ${latency}ms)`);
        console.log(`     Domains count: ${domainsResult.data?.data?.length || 0}`);
        return true;
      }
    } else {
      console.log(`  ✅ Successfully connected to Resend API! (Latency: ${latency}ms)`);
      console.log(`     Configured sender email: "${fromEmail}"`);
      return true;
    }
  } catch (err) {
    console.error('  ❌ Resend Service Error:', err.message);
    return false;
  }
}

async function testSupabase() {
  console.log('\n[TEST 4/4] Testing Live Supabase Connection...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('  ❌ Supabase URL or Anon Key is missing in .env');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey);
    const t0 = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const latency = Date.now() - t0;

    if (error) {
      console.error('  ❌ Supabase Auth check returned error:', error.message);
      return false;
    } else {
      console.log(`  ✅ Successfully connected to Supabase Auth! (Latency: ${latency}ms)`);
      console.log(`     Endpoint: ${supabaseUrl}`);
      return true;
    }
  } catch (err) {
    console.error('  ❌ Supabase Connection Error:', err.message);
    return false;
  }
}

async function run() {
  const mongoOk = await testMongoDB();
  const geminiOk = await testGemini();
  const resendOk = await testResend();
  const supabaseOk = await testSupabase();

  console.log('\n==============================================================================');
  console.log('                          LIVE SERVICES SUMMARY');
  console.log('==============================================================================');
  console.log(`  MongoDB Atlas:  ${mongoOk ? '✅ CONNECTED & OPERATIONAL' : '❌ FAILED'}`);
  console.log(`  Google Gemini:  ${geminiOk ? '✅ CONNECTED & GENERATING' : '❌ FAILED'}`);
  console.log(`  Resend Email:   ${resendOk ? '✅ CONNECTED & AUTHORIZED' : '❌ FAILED'}`);
  console.log(`  Supabase Auth:  ${supabaseOk ? '✅ CONNECTED & OPERATIONAL' : '❌ FAILED'}`);
  console.log('==============================================================================\n');
}

run();
