require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🔍 Testing authentication system...');
  
  try {
    // Test database connection
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    
    console.log(`✅ Database connected. Found ${users.length} users.`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuth();