create table public.article_comments (
 id uuid primary key default gen_random_uuid(),
 article_path text not null,
 name text not null check(char_length(name) between 2 and 60),
 content text not null check(char_length(content) between 3 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create index article_comments_public on public.article_comments(article_path,created_at desc,id desc) where status='approved';
create index article_comments_pending on public.article_comments(created_at desc) where status='pending';
alter table public.article_comments enable row level security;
revoke all on public.article_comments from anon,authenticated;
grant all on public.article_comments to service_role;
create table public.article_comment_limits(fingerprint text primary key,last_sent timestamptz not null, sent_count integer not null);
alter table public.article_comment_limits enable row level security;
revoke all on public.article_comment_limits from anon,authenticated;
grant all on public.article_comment_limits to service_role;
create function public.submit_article_comment(p_article text,p_name text,p_content text,p_fingerprint text) returns text language plpgsql security invoker set search_path='' as $$
declare n integer; last_time timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
 delete from public.article_comment_limits where last_sent < now()-interval '2 days';
 select sent_count,last_sent into n,last_time from public.article_comment_limits where fingerprint=p_fingerprint;
 if n>=5 or last_time>now()-interval '1 minute' then return 'limited'; end if;
 if exists(select 1 from public.article_comments where article_path=p_article and name=p_name and content=p_content and created_at>now()-interval '1 day') then return 'pending'; end if;
 insert into public.article_comments(article_path,name,content) values(p_article,p_name,p_content);
 insert into public.article_comment_limits values(p_fingerprint,now(),1) on conflict(fingerprint) do update set sent_count=article_comment_limits.sent_count+1,last_sent=now();
 return 'pending';
end $$;
revoke all on function public.submit_article_comment(text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_article_comment(text,text,text,text) to service_role;
