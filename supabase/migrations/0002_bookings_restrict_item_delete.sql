-- Booking (and therefore rating/message) history must survive an item being
-- taken down. Cascading item deletes would silently destroy a renter's
-- transaction history, so deleting an item with any booking history is
-- disallowed at the database level; the app instead offers "delist"
-- (items.is_active = false) once an item has bookings.

alter table public.bookings drop constraint bookings_item_id_fkey;

alter table public.bookings
  add constraint bookings_item_id_fkey
  foreign key (item_id) references public.items (id) on delete restrict;

-- Defense-in-depth on top of the client's accept="image/*": reject
-- non-image uploads and cap individual file size at the storage layer too.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    file_size_limit = 5242880 -- 5 MB
where id = 'item-images';
