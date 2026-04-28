const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../supabase/migrations/20260401000000_init_schema.sql');

if (!fs.existsSync(migrationPath)) {
  console.error('Migration file not found');
  process.exit(1);
}

const content = fs.readFileSync(migrationPath, 'utf8');

const tables = ['profiles', 'matches', 'predictions'];
let missing = false;

tables.forEach(table => {
  if (!content.includes(`CREATE TABLE public.${table}`)) {
    console.error(`Missing CREATE TABLE public.${table}`);
    missing = true;
  }
});

if (!content.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY')) {
    console.error('Missing RLS for profiles');
    missing = true;
}

if (!content.includes('ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY')) {
    console.error('Missing RLS for matches');
    missing = true;
}

if (!content.includes('ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY')) {
    console.error('Missing RLS for predictions');
    missing = true;
}

if (missing) {
  process.exit(1);
}

console.log('Schema verification passed');
