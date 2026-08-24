-- Bug: protect_profile_columns (0001) was blocking ANY non-service-role
-- update to rating_avg/rating_count, including the legitimate one from
-- update_profile_rating's own trigger on the ratings table - so a renter's
-- or owner's rating_avg never actually updated after a review was posted.
--
-- Fix: only reset those columns when the update comes directly from a
-- client statement (pg_trigger_depth() <= 1). A write nested inside
-- update_profile_rating's AFTER INSERT/UPDATE/DELETE trigger on `ratings`
-- runs one level deeper (pg_trigger_depth() = 2) and is left alone.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' and pg_trigger_depth() <= 1 then
    new.role := old.role;
    new.is_blocked := old.is_blocked;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
  end if;
  return new;
end;
$$;

-- Backfill: recompute aggregates for any profile with existing ratings that
-- were silently discarded by the bug above.
update public.profiles p
set rating_count = agg.cnt,
    rating_avg = agg.avg_score
from (
  select ratee_id, count(*) as cnt, round(avg(score)::numeric, 2) as avg_score
  from public.ratings
  group by ratee_id
) agg
where p.id = agg.ratee_id;
