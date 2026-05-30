create table if not exists public.finance_wallets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  type text not null default 'bank',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'saving')),
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  date date not null,
  note text not null default '',
  wallet_id text,
  is_transfer boolean not null default false,
  linked_tx_id text,
  happened_at_ms bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

create table if not exists public.finance_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null default 0 check (target_amount >= 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  icon text not null default 'Target',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_recurring_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'saving')),
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  wallet_id text,
  interval text not null default 'monthly',
  due_day integer not null default 1 check (due_day between 1 and 31),
  last_triggered date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  currency text not null default 'THB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_wallets_user_id_idx on public.finance_wallets(user_id);
create index if not exists finance_transactions_user_date_idx on public.finance_transactions(user_id, date desc, happened_at_ms desc);
create index if not exists finance_transactions_user_wallet_idx on public.finance_transactions(user_id, wallet_id);
create index if not exists finance_goals_user_id_idx on public.finance_goals(user_id);
create index if not exists finance_recurring_user_due_idx on public.finance_recurring_transactions(user_id, due_day);

alter table public.finance_wallets enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_goals enable row level security;
alter table public.finance_recurring_transactions enable row level security;
alter table public.finance_preferences enable row level security;

grant select, insert, update, delete on public.finance_wallets to authenticated;
grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.finance_budgets to authenticated;
grant select, insert, update, delete on public.finance_goals to authenticated;
grant select, insert, update, delete on public.finance_recurring_transactions to authenticated;
grant select, insert, update, delete on public.finance_preferences to authenticated;

create policy "Users can select own wallets"
  on public.finance_wallets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own wallets"
  on public.finance_wallets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own wallets"
  on public.finance_wallets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own wallets"
  on public.finance_wallets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own transactions"
  on public.finance_transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own transactions"
  on public.finance_transactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own transactions"
  on public.finance_transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own transactions"
  on public.finance_transactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own budgets"
  on public.finance_budgets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own budgets"
  on public.finance_budgets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own budgets"
  on public.finance_budgets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own budgets"
  on public.finance_budgets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own goals"
  on public.finance_goals for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own goals"
  on public.finance_goals for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own goals"
  on public.finance_goals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own goals"
  on public.finance_goals for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own recurring transactions"
  on public.finance_recurring_transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own recurring transactions"
  on public.finance_recurring_transactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own recurring transactions"
  on public.finance_recurring_transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own recurring transactions"
  on public.finance_recurring_transactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own preferences"
  on public.finance_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own preferences"
  on public.finance_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own preferences"
  on public.finance_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own preferences"
  on public.finance_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

do $$
declare
  finance_table_name text;
begin
  foreach finance_table_name in array array[
    'finance_wallets',
    'finance_transactions',
    'finance_budgets',
    'finance_goals',
    'finance_recurring_transactions',
    'finance_preferences'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = finance_table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', finance_table_name);
    end if;
  end loop;
end $$;
