-- ─────────────────────────────────────────────────────────────────────────────
-- Explain Yourself — storage
--
-- One private bucket. No public URLs, ever. Access is granted per object, and
-- only for photos that are actually in play.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'gameplay-photos',
    'gameplay-photos',
    false,                          -- the entire privacy model rests on this
    3145728,                        -- 3 MB: a 1600px JPEG is ~300-600 KB
    array['image/jpeg']
)
on conflict (id) do update
set public             = false,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: rooms/{room_id}/{owner_id}/{asset_id}.jpg
-- The owner id is in the path so a mis-scoped policy fails closed and visibly
-- rather than silently handing out someone else's folder.

-- ── Upload ──────────────────────────────────────────────────────────────────
-- You may only write into your own folder, in a room you are actually in.
create policy gameplay_photos_insert_own
on storage.objects for insert to authenticated
with check (
    bucket_id = 'gameplay-photos'
    and (storage.foldername(name))[1] = 'rooms'
    and (storage.foldername(name))[3] = auth.uid()::text
    and public.is_room_member(((storage.foldername(name))[2])::uuid)
);

-- ── Read ────────────────────────────────────────────────────────────────────
-- This is the policy that keeps the surprise, and it is stricter than it looks.
--
-- The obvious version — "any member of the room may read any asset in it" —
-- would let a curious player list the bucket before the game starts and see
-- every photo everyone approved. The whole product depends on not knowing which
-- photo is coming, so an asset is readable only once a round has actually dealt
-- it, and never after its owner pulled it.
create policy gameplay_photos_select_in_play
on storage.objects for select to authenticated
using (
    bucket_id = 'gameplay-photos'
    and exists (
        select 1
        from public.approved_game_assets a
        where a.storage_path = storage.objects.name
          and a.purged_at is null
          and a.expires_at > now()
          and (
              -- Your own photo, always.
              a.owner_id = auth.uid()
              or (
                  public.is_room_member(a.room_id)
                  and exists (
                      select 1 from public.rounds r
                      where r.asset_id = a.id
                        and r.room_id = a.room_id
                        and r.status in ('active', 'complete')
                  )
              )
          )
    )
);

-- ── Delete ──────────────────────────────────────────────────────────────────
-- Owners can delete their own bytes at any time, which is what makes REMOVE
-- PHOTO immediate rather than eventual.
create policy gameplay_photos_delete_own
on storage.objects for delete to authenticated
using (
    bucket_id = 'gameplay-photos'
    and (storage.foldername(name))[3] = auth.uid()::text
);

-- No update policy: a gameplay copy is written once and then only read or
-- deleted. Allowing overwrite would let somebody swap the photo after the room
-- has already reacted to it.
