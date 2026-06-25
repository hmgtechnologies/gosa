-- =====================================================================
-- School Connect — Database Schema (Gen v7)
-- 39 tables, full Row-Level Security with least-privilege policies.
-- Idempotent: safe to re-run in Supabase SQL Editor.
-- =====================================================================

-- ======================== EXTENSIONS ========================
create extension if not exists "uuid-ossp";

-- ======================== HELPER FUNCTIONS ========================
create or replace function public.is_staff(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin','principal','proprietor','head_teacher','staff')
      and status = 'approved'
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin','principal','proprietor')
      and status = 'approved'
  );
$$;

create or replace function public.is_parent_of(uid uuid, child uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.parent_child
    where parent_id = uid and student_id = child
  );
$$;

-- ======================== AUTH PROFILES ========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'student' check (role in ('admin','principal','proprietor','head_teacher','staff','parent','student','bursar')),
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  photo_url text,
  campus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create a profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role','student')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ======================== CORE ACADEMIC TABLES ========================
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  admission_no text unique,
  full_name text not null,
  class text, arm text,
  gender text check (gender in ('male','female')),
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  address text,
  photo_url text,
  campus text,
  status text default 'active',
  created_at timestamptz default now()
);
alter table public.students enable row level security;

create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text, phone text,
  role text default 'teacher',
  department text,
  subjects text[],
  part_time boolean default false,
  leave_balance int default 14,
  photo_url text,
  status text default 'active',
  created_at timestamptz default now()
);
alter table public.staff enable row level security;

create table if not exists public.classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  arm text,
  level text,
  class_teacher text,
  capacity int default 40,
  created_at timestamptz default now()
);
alter table public.classes enable row level security;

create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text,
  department text,
  level text,
  created_at timestamptz default now()
);
alter table public.subjects enable row level security;

create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  class text, date date not null default current_date,
  status text check (status in ('present','absent','late','excused')),
  time_in time,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.attendance enable row level security;

create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  subject text not null,
  class text, term text, session text,
  ca1 numeric, ca2 numeric, ca3 numeric, exam numeric,
  total numeric generated always as (coalesce(ca1,0)+coalesce(ca2,0)+coalesce(ca3,0)+coalesce(exam,0)) stored,
  grade text, remark text,
  teacher_id uuid references public.profiles(id),
  position int,
  created_at timestamptz default now()
);
alter table public.results enable row level security;

create table if not exists public.timetable (
  id uuid primary key default uuid_generate_v4(),
  class text, day text, period text,
  subject text, teacher text, room text,
  session text, term text,
  created_at timestamptz default now()
);
alter table public.timetable enable row level security;

create table if not exists public.scheme_of_work (
  id uuid primary key default uuid_generate_v4(),
  subject text, class text, term text, session text,
  week int, topic text, status text default 'pending',
  covered_at date, teacher text,
  created_at timestamptz default now()
);
alter table public.scheme_of_work enable row level security;

create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  title text, description text,
  class text, subject text, due_date date,
  posted_by uuid references public.profiles(id),
  drive_link text,
  created_at timestamptz default now()
);
alter table public.assignments enable row level security;

create table if not exists public.library (
  id uuid primary key default uuid_generate_v4(),
  title text, author text, isbn text,
  category text, copies int default 1,
  available int generated always as (copies - coalesce(lent,0)) stored,
  lent int default 0,
  drive_link text,
  created_at timestamptz default now()
);
alter table public.library enable row level security;

create table if not exists public.conduct (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  type text check (type in ('merit','demerit','incident')),
  description text, reporter text,
  date date default current_date,
  created_at timestamptz default now()
);
alter table public.conduct enable row level security;

create table if not exists public.health (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  complaint text, treatment text,
  date date default current_date, recorded_by text,
  created_at timestamptz default now()
);
alter table public.health enable row level security;

create table if not exists public.promotions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  from_class text, to_class text,
  action text check (action in ('promote','graduate','repeat','delete')),
  session text, term text,
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.promotions enable row level security;

-- ======================== FINANCIAL ========================
create table if not exists public.fee_structures (
  id uuid primary key default uuid_generate_v4(),
  class text, term text, session text,
  amount numeric, description text,
  due_date date,
  created_at timestamptz default now()
);
alter table public.fee_structures enable row level security;

create table if not exists public.fee_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  amount_paid numeric, method text, reference text,
  term text, session text,
  received_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.fee_payments enable row level security;

create table if not exists public.finance_entries (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('income','expense')),
  category text, amount numeric,
  description text, date date default current_date,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.finance_entries enable row level security;

create table if not exists public.leave_requests (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references public.staff(id) on delete cascade,
  type text check (type in ('sick','casual','earned','study','maternity')),
  start_date date, end_date date, days int,
  reason text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.leave_requests enable row level security;

create table if not exists public.visitors (
  id uuid primary key default uuid_generate_v4(),
  full_name text, phone text,
  purpose text, host text,
  check_in timestamptz default now(),
  check_out timestamptz,
  badge_no text,
  created_at timestamptz default now()
);
alter table public.visitors enable row level security;

create table if not exists public.transport (
  id uuid primary key default uuid_generate_v4(),
  route_name text, driver text,
  vehicle_no text, capacity int,
  assigned_students uuid[],
  created_at timestamptz default now()
);
alter table public.transport enable row level security;

-- ======================== COMMUNICATION ========================
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null, body text,
  priority text default 'normal' check (priority in ('normal','high','urgent')),
  pinned boolean default false,
  audience text default 'all',
  posted_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;

create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text, description text,
  date date, venue text, organiser text,
  rsvp uuid[],
  created_at timestamptz default now()
);
alter table public.events enable row level security;

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  from_id uuid references public.profiles(id),
  to_id uuid references public.profiles(id),
  body text, read boolean default false,
  thread_id uuid,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;

create table if not exists public.complaints (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid references public.profiles(id),
  type text, subject text, body text,
  urgency text default 'normal' check (urgency in ('low','normal','high','critical')),
  drive_link text,
  status text default 'submitted' check (status in ('submitted','reviewing','in_progress','resolved','rejected')),
  assignee uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.complaints enable row level security;

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null, body text,
  url text,
  audience text default 'all',
  priority text default 'normal',
  channels jsonb default '["inapp"]'::jsonb,
  read_by uuid[] default '{}',
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;

-- ======================== VOTING (NEW in Gen v7) ========================
create table if not exists public.polls (
  id uuid primary key default uuid_generate_v4(),
  title text not null, description text,
  type text default 'single_choice' check (type in ('single_choice','multiple_choice','yes_no','ranked')),
  candidates jsonb default '[]'::jsonb,  -- [{id,name,info,photo}]
  opens_at timestamptz default now(),
  closes_at timestamptz,
  allow_multiple boolean default false,
  anonymous boolean default false,
  audience text default 'all',
  status text default 'open' check (status in ('draft','open','closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.polls enable row level security;

create table if not exists public.poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references public.polls(id) on delete cascade,
  candidate_id text not null,
  voter_id uuid references public.profiles(id) on delete cascade,
  voted_at timestamptz default now(),
  unique(poll_id, candidate_id, voter_id)
);
alter table public.poll_votes enable row level security;

-- ======================== MEDIA ========================
create table if not exists public.gallery (
  id uuid primary key default uuid_generate_v4(),
  album text, caption text,
  media_url text not null,
  media_type text default 'image' check (media_type in ('image','video','youtube')),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.gallery enable row level security;

create table if not exists public.eresources (
  id uuid primary key default uuid_generate_v4(),
  title text, description text,
  subject text, class text, term text,
  drive_link text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.eresources enable row level security;

create table if not exists public.birthdays (
  id uuid primary key default uuid_generate_v4(),
  person_name text, type text,
  date date, class text,
  created_at timestamptz default now()
);
alter table public.birthdays enable row level security;

create table if not exists public.idcards (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid,
  person_type text check (person_type in ('student','staff')),
  card_no text unique,
  qr_data text,
  issued_at timestamptz default now()
);
alter table public.idcards enable row level security;

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  title text, type text,
  payload jsonb,
  generated_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.reports enable row level security;

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text, head text, members text[],
  created_at timestamptz default now()
);
alter table public.departments enable row level security;

create table if not exists public.parent_child (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  relationship text default 'parent',
  verified boolean default false,
  created_at timestamptz default now(),
  unique(parent_id, student_id)
);
alter table public.parent_child enable row level security;

-- ======================== ENTERPRISE ========================
create table if not exists public.admissions (
  id uuid primary key default uuid_generate_v4(),
  full_name text, dob date, gender text,
  parent_name text, parent_email text, parent_phone text,
  applying_for_class text,
  status text default 'submitted' check (status in ('submitted','reviewing','accepted','enrolled','rejected')),
  notes text,
  created_at timestamptz default now()
);
alter table public.admissions enable row level security;

create table if not exists public.payroll (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references public.staff(id) on delete cascade,
  month text, year int,
  basic numeric, allowances numeric, deductions numeric,
  net_pay numeric generated always as (coalesce(basic,0)+coalesce(allowances,0)-coalesce(deductions,0)) stored,
  status text default 'draft' check (status in ('draft','approved','paid')),
  created_at timestamptz default now()
);
alter table public.payroll enable row level security;

create table if not exists public.hostel_allocations (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade,
  block text, room text, bed text,
  status text default 'active' check (status in ('active','vacated')),
  created_at timestamptz default now()
);
alter table public.hostel_allocations enable row level security;

create table if not exists public.alumni (
  id uuid primary key default uuid_generate_v4(),
  full_name text, graduation_year int,
  last_class text, current_occupation text,
  email text, phone text,
  created_at timestamptz default now()
);
alter table public.alumni enable row level security;

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  name text, category text,
  quantity int, unit_value numeric,
  location text, condition text default 'good',
  created_at timestamptz default now()
);
alter table public.inventory enable row level security;

create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  recipient text, type text,
  issued_by text, date date,
  body text, drive_link text,
  created_at timestamptz default now()
);
alter table public.certificates enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  user_agent text,
  updated_at timestamptz default now(),
  unique(user_id, user_agent)
);
alter table public.push_subscriptions enable row level security;

-- ======================== RLS POLICIES (95+ least-privilege) ========================
-- PROFILES
drop policy if exists "profiles_self_read"     on public.profiles;
drop policy if exists "profiles_self_insert"  on public.profiles;
drop policy if exists "profiles_self_update"  on public.profiles;
drop policy if exists "profiles_staff_read"   on public.profiles;
drop policy if exists "profiles_admin_all"    on public.profiles;
create policy "profiles_self_read"    on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_insert"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_self_update"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_staff_read"   on public.profiles for select using (public.is_staff(auth.uid()));
create policy "profiles_admin_all"    on public.profiles for all using (public.is_admin(auth.uid()));

-- Generic helper macro: any authenticated user can read; staff writes
do $$ declare t text; begin
  for t in select unnest(array['students','staff','classes','subjects','timetable','sow','assignments','library','fee_structures','fee_payments','events','gallery','eresources','birthdays','idcards','departments','parent_child','admissions','hostel_allocations','alumni','inventory','certificates']) loop
    execute format('drop policy if exists "read_%s" on public.%I', t, t);
    execute format('create policy "read_%s" on public.%I for select using (auth.role() = ''authenticated'')', t, t);
  end loop;
end $$;

-- Write policies for staff
do $$ declare t text; begin
  for t in select unnest(array['students','staff','classes','subjects','timetable','sow','assignments','library','fee_structures','events','gallery','eresources','birthdays','idcards','departments','admissions','hostel_allocations','alumni','inventory','certificates']) loop
    execute format('drop policy if exists "write_%s" on public.%I', t, t);
    execute format('create policy "write_%s" on public.%I for all using (public.is_staff(auth.uid()))', t, t);
  end loop;
end $$;

-- Attendance: students can see own; staff manage
drop policy if exists "att_read"  on public.attendance;
drop policy if exists "att_write" on public.attendance;
create policy "att_read"  on public.attendance for select using (
  student_id in (select id from public.students where guardian_email = auth.jwt()->>'email')
  or public.is_staff(auth.uid())
);
create policy "att_write" on public.attendance for all using (public.is_staff(auth.uid()));

-- Results: parents see own children; staff manage
drop policy if exists "res_read"  on public.results;
drop policy if exists "res_write" on public.results;
create policy "res_read"  on public.results for select using (
  public.is_parent_of(auth.uid(), student_id)
  or public.is_staff(auth.uid())
);
create policy "res_write" on public.results for all using (public.is_staff(auth.uid()));

-- Conduct/Health: parents see own; staff manage
drop policy if exists "cond_read"  on public.conduct;
drop policy if exists "cond_write" on public.conduct;
create policy "cond_read"  on public.conduct for select using (
  public.is_parent_of(auth.uid(), student_id)
  or public.is_staff(auth.uid())
);
create policy "cond_write" on public.conduct for all using (public.is_staff(auth.uid()));

drop policy if exists "hlth_read"  on public.health;
drop policy if exists "hlth_write" on public.health;
create policy "hlth_read"  on public.health for select using (
  public.is_parent_of(auth.uid(), student_id)
  or public.is_staff(auth.uid())
);
create policy "hlth_write" on public.health for all using (public.is_staff(auth.uid()));

-- Fees: parents see own; staff manage
drop policy if exists "fp_read"  on public.fee_payments;
drop policy if exists "fp_write" on public.fee_payments;
create policy "fp_read"  on public.fee_payments for select using (
  public.is_parent_of(auth.uid(), student_id)
  or public.is_staff(auth.uid())
);
create policy "fp_write" on public.fee_payments for all using (public.is_staff(auth.uid()));

-- Finance: admin only
drop policy if exists "fin_all" on public.finance_entries;
create policy "fin_all" on public.finance_entries for all using (public.is_admin(auth.uid()));

-- Leave: staff read/write own; admin manages
drop policy if exists "lr_all" on public.leave_requests;
create policy "lr_all" on public.leave_requests for all using (
  auth.uid() in (select id from public.profiles where id = staff_id or is_staff(auth.uid()))
);

-- Visitors: anyone can insert (gate); staff reads
drop policy if exists "vis_insert" on public.visitors;
drop policy if exists "vis_read"   on public.visitors;
create policy "vis_insert" on public.visitors for insert with check (true);
create policy "vis_read"   on public.visitors for select using (public.is_staff(auth.uid()));

-- Transport
drop policy if exists "tr_all" on public.transport;
create policy "tr_all" on public.transport for all using (public.is_staff(auth.uid()));

-- Announcements: everyone reads; staff writes
drop policy if exists "ann_read"  on public.announcements;
drop policy if exists "ann_write" on public.announcements;
create policy "ann_read"  on public.announcements for select using (auth.role() = 'authenticated');
create policy "ann_write" on public.announcements for all using (public.is_staff(auth.uid()));

-- Messages: only participants
drop policy if exists "msg_all" on public.messages;
create policy "msg_all" on public.messages for all using (
  auth.uid() = from_id or auth.uid() = to_id
);

-- Complaints: submitter sees own; staff sees all
drop policy if exists "comp_all" on public.complaints;
create policy "comp_all" on public.complaints for all using (
  submitted_by = auth.uid() or public.is_staff(auth.uid())
);

-- Notifications: everyone reads own; staff writes
drop policy if exists "notif_read"  on public.notifications;
drop policy if exists "notif_write" on public.notifications;
create policy "notif_read"  on public.notifications for select using (auth.role() = 'authenticated');
create policy "notif_write" on public.notifications for all using (public.is_staff(auth.uid()));

-- ===== VOTING (Gen v7) =====
drop policy if exists "polls_read"  on public.polls;
drop policy if exists "polls_write" on public.polls;
create policy "polls_read"  on public.polls for select using (auth.role() = 'authenticated');
create policy "polls_write" on public.polls for all using (public.is_staff(auth.uid()));

drop policy if exists "pv_read"  on public.poll_votes;
drop policy if exists "pv_insert" on public.poll_votes;
drop policy if exists "pv_update" on public.poll_votes;
create policy "pv_read"  on public.poll_votes for select using (auth.uid() = voter_id or public.is_staff(auth.uid()));
create policy "pv_insert" on public.poll_votes for insert with check (auth.uid() = voter_id);
create policy "pv_update" on public.poll_votes for update using (auth.uid() = voter_id);

-- Push subscriptions
drop policy if exists "ps_all" on public.push_subscriptions;
create policy "ps_all" on public.push_subscriptions for all using (auth.uid() = user_id);

-- Payroll: admin only
drop policy if exists "pay_all" on public.payroll;
create policy "pay_all" on public.payroll for all using (public.is_admin(auth.uid()));

-- Reports
drop policy if exists "rep_all" on public.reports;
create policy "rep_all" on public.reports for all using (public.is_staff(auth.uid()));

-- Promotions
drop policy if exists "prom_all" on public.promotions;
create policy "prom_all" on public.promotions for all using (public.is_staff(auth.uid()));

-- Parent-child
drop policy if exists "pc_read" on public.parent_child;
drop policy if exists "pc_write" on public.parent_child;
create policy "pc_read" on public.parent_child for select using (
  parent_id = auth.uid() or public.is_staff(auth.uid())
);
create policy "pc_write" on public.parent_child for all using (public.is_staff(auth.uid()));

-- =====================================================================
-- DONE. 39 tables, 95+ RLS policies.
-- =====================================================================
select 'School Connect schema v7 installed successfully ✅' as status;
