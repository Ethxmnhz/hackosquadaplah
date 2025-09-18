-- Performance indexes for common query patterns used in the app
-- Created on 2025-09-18

-- Challenge completions by user
create index if not exists idx_challenge_completions_user on public.challenge_completions(user_id);
create index if not exists idx_challenge_completions_challenge on public.challenge_completions(challenge_id);

-- Lab completions by user
create index if not exists idx_lab_completions_user on public.lab_completions(user_id);
create index if not exists idx_lab_completions_lab on public.lab_completions(lab_id);

-- User points by user and created_at
create index if not exists idx_user_points_user on public.user_points(user_id);
create index if not exists idx_user_points_user_created_at on public.user_points(user_id, created_at desc);

-- Skill path progress
create index if not exists idx_skill_path_progress_user on public.skill_path_progress(user_id);
create index if not exists idx_skill_path_item_progress_user on public.skill_path_item_progress(user_id);

-- Badges by user
create index if not exists idx_user_badges_user on public.user_badges(user_id);

-- Team memberships
create index if not exists idx_team_members_user on public.team_members(user_id);

-- Optional: materialized view suggestions (documented; implement later)
-- create materialized view public.mv_user_stats as
-- select u.id as user_id,
--        coalesce((select sum(points) from public.user_points up where up.user_id = u.id), 0) as total_points,
--        coalesce((select count(1) from public.challenge_completions cc where cc.user_id = u.id), 0) as challenges_completed,
--        coalesce((select count(1) from public.lab_completions lc where lc.user_id = u.id), 0) as labs_completed
-- from public.profiles u;
-- create unique index if not exists mv_user_stats_user on public.mv_user_stats(user_id);
-- refresh materialized view concurrently public.mv_user_stats;
