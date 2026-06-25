// ====================================================================
// School Connect — Site Config (auto-generated)
// Replace the URL and anon key below with your Supabase project values.
// ====================================================================
window.SUPABASE_URL = 'https://dgarrlzbmscpgtefdupm.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnYXJybHpibXNjcGd0ZWZkdXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzc0MTYsImV4cCI6MjA5NzkxMzQxNn0.7CNB3KcQD3NHr6ENDGb7gRX_ld_xjgpQeL_YVuLRW_A';
window.SCHOOL = {
  name:    'God Of Seed Academy',
  short:   'GOSA',
  motto:   'Excellence in Learning and Character',
  currency:'₦',
  phone:   '',
  email:   'godofseedacademy@gmail.com',
  address: '63B, Ishaga Abosule Street, Agbado Crossing, Ogun State.',
  campuses:[],
  theme:   'theme1',
  font:    'inter',
  layout:  'layout0',
  modules: ["students","staff","classes","attendance","results","timetable","sow","cbt","report-cards","timetable-generator","checkin","assignments","conduct","promotion","lesson_plans","support_plans","analytics","admin-data","settings","admissions","hr","certificates","activity_log","diary","surveys","announcements","messages","inbox","complaints","broadcast","voting","parent_meeting","gallery","eresources","birthdays","idcards","flyer","reports","directory","departments","parents","school_calendar","lost_found","fees","finance","leave","payments_online"],
  levels:  ["JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3"],
  hmgLink: 'https://hmgconcepts.pages.dev/',
  logoExt: 'jpg'
};

// Build the supabase client
const sb = (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

console.log('%c[God Of Seed Academy] School Connect ready.', 'color:#b7bb2b;font-weight:bold;font-size:13px');
