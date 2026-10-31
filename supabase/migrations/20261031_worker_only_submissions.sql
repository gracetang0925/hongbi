-- Run as the project owner against the existing HongBi submissions table.
-- This deliberately retires direct browser access. Deploy the new Worker and
-- both updated pages in the same maintenance window. No records are deleted.
begin;
alter table public.submissions enable row level security;
revoke all privileges on table public.submissions from public, anon, authenticated;
grant select, insert, update on table public.submissions to service_role;

-- Some existing installations use a serial/bigserial ID, others use UUIDs.
-- Grant only that table's ID sequence when present, without touching other tables.
do $$
declare id_sequence text;
begin
  id_sequence := pg_get_serial_sequence('public.submissions', 'id');
  if id_sequence is not null then
    execute format('grant usage, select on sequence %s to service_role', id_sequence);
  end if;
end $$;

create index if not exists submissions_session_created_idx
  on public.submissions (session_id, created_at desc);
create index if not exists submissions_mode_created_idx
  on public.submissions (mode, created_at desc);
commit;
