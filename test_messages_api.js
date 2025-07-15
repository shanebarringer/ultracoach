const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Test script to check messages API issues
async function testMessagesAPI() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ccnbzjpccmlribljugve.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbmJ6anBjY21scmlibGp1Z3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI2ODA4OSwiZXhwIjoyMDY3ODQ0MDg5fQ.TDJj3NMc_8EHzxMyWw1gYEQxLFZVZfX5Iu7tZFnKhaI';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check if users table exists and has the right structure
    console.log('\n1. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
      return;
    }
    console.log('✅ Users table OK. Sample user:', users[0] ? {
      id: users[0].id,
      email: users[0].email,
      role: users[0].role,
      has_password_hash: !!users[0].password_hash
    } : 'No users found');
    
    // Test 2: Check if messages table exists and has the right structure
    console.log('\n2. Testing messages table...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Messages table error:', messagesError);
      return;
    }
    console.log('✅ Messages table OK. Sample message:', messages[0] || 'No messages found');
    
    // Test 3: Try to insert a test message
    console.log('\n3. Testing message insertion...');
    const testUserId = '11111111-1111-1111-1111-111111111111'; // Alex from seed data
    const testRecipientId = '8e679919-9824-4733-a726-0bafbba146b3'; // Coach Sarah
    
    const { data: insertResult, error: insertError } = await supabase
      .from('messages')
      .insert([{
        content: 'Test message from API test',
        sender_id: testUserId,
        recipient_id: testRecipientId,
        read: false
      }])
      .select('*')
      .single();
    
    if (insertError) {
      console.error('❌ Message insertion error:', insertError);
      return;
    }
    console.log('✅ Message insertion OK:', insertResult);
    
    // Clean up test message
    await supabase
      .from('messages')
      .delete()
      .eq('id', insertResult.id);
    
    console.log('\n✅ All tests passed! Messages API should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMessagesAPI();