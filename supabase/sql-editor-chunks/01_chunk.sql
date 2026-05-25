create extension if not exists "pgcrypto";

create schema if not exists app;

create type public.staff_role as enum ('admin', 'staff');
create type public.practical_period as enum ('P1_2', 'P2_3', 'P3_4', 'undecided');
create type public.action_type as enum ('call', 'line', 'zoom', 'email', 'event', 'note', 'ai');
create type public.message_direction as enum ('in', 'out');
create type public.message_type as enum ('text', 'image', 'sticker', 'flex', 'file', 'audio', 'video', 'location', 'unknown');
create type public.broadcast_status as enum ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
create type public.survey_question_type as enum ('text', 'radio', 'checkbox', 'image_upload');
create type public.match_type as enum ('exact', 'contains', 'regex');
create type public.recording_source as enum ('zoom', 'upload', 'browser');
create type public.resource_kind as enum ('approach_policy', 'talk_script', 'event_info', 'faq', 'other');
create type public.notification_channel as enum ('line', 'email', 'both');
create type public.import_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.import_row_status as enum ('success', 'failed', 'skipped', 'duplicate_pending');

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
