create table public.staff_users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  role public.staff_role not null default 'staff',
  line_user_id text unique,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  display_name text,
  real_name text,
  kana text,
  university text,
  grade text,
  graduation_year integer,
  practical_period public.practical_period not null default 'undecided',
  phone text,
  email text,
  phone_encrypted bytea,
  email_encrypted bytea,
  desired_job_type text,
  desired_area text,
  motivation_level integer check (motivation_level between 1 and 5),
  first_contact_method text,
  first_contact_date date,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  ai_next_action text,
  manual_next_action text,
  status text not null default 'active',
  optimistic_lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_assignees (
  student_id uuid not null references public.students(id) on delete cascade,
  staff_id uuid not null references public.staff_users(id) on delete cascade,
  assigned_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, staff_id)
);

create table public.student_actions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  staff_id uuid references public.staff_users(id) on delete set null,
  action_type public.action_type not null,
  title text not null,
  body text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#2563eb',
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_tags (
  student_id uuid not null references public.students(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, tag_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  direction public.message_direction not null,
  type public.message_type not null default 'text',
  payload jsonb not null default '{}'::jsonb,
  line_message_id text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  staff_id uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_jsonb jsonb not null default '{}'::jsonb,
  target_tag_ids jsonb not null default '[]'::jsonb,
  excluded_tag_ids jsonb not null default '[]'::jsonb,
  target_mode text not null default 'or' check (target_mode in ('and', 'or')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references public.staff_users(id) on delete set null,
  status public.broadcast_status not null default 'draft',
  test_sent_to uuid references public.staff_users(id) on delete set null,
  estimated_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
