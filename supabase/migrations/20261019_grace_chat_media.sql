-- Run in the Supabase SQL editor before enabling media persistence.
-- Private bucket: only the authenticated owner can access their media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grace-chat-media', 'grace-chat-media', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false;

create policy "Grace chat media: owner can upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'grace-chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Grace chat media: owner can view"
on storage.objects for select to authenticated
using (bucket_id = 'grace-chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Grace chat media: owner can delete"
on storage.objects for delete to authenticated
using (bucket_id = 'grace-chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
