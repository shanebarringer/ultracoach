const { createClient } = require('@supabase/supabase-js');

async function checkUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ccnbzjpccmlribljugve.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbmJ6anBjY21scmlibGp1Z3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI2ODA4OSwiZXhwIjoyMDY3ODQ0MDg5fQ.TDJj3NMc_8EHzxMyWw1gYEQxLFZVZfX5Iu7tZFnKhaI';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🔍 Checking all users in database...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .order('email');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n📊 Found ${users.length} users:`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (${user.full_name}) - ${user.role}`);
    console.log(`   ID: ${user.id}`);
  });
  
  // Check if seed data users exist
  const seedUserIds = [
    '8e679919-9824-4733-a726-0bafbba146b3', // Sarah
    'c2222222-2222-2222-2222-222222222222', // Mike
    '11111111-1111-1111-1111-111111111111', // Alex
    '22222222-2222-2222-2222-222222222222', // Jordan
  ];
  
  console.log('\n🔍 Checking seed data users...');
  const foundIds = users.map(u => u.id);
  seedUserIds.forEach(id => {
    const exists = foundIds.includes(id);
    console.log(`${exists ? '✅' : '❌'} ${id} - ${exists ? 'EXISTS' : 'MISSING'}`);
  });
}

checkUsers();