update storage.buckets
set
  file_size_limit = 47185920,
  allowed_mime_types = array[
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg',
    'video/mp4'
  ]
where id = 'recordings';

select
  id,
  name,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'recordings';
