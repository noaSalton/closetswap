-- Tables aren't broadcast over Supabase Realtime until they're added to the
-- supabase_realtime publication. The chat panel subscribes to inserts on
-- this table (see components/ChatPanel.tsx).
alter publication supabase_realtime add table public.messages;
