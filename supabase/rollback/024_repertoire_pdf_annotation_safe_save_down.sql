-- 024 down: remove the revision-checked annotation RPC and restore the exact
-- pre-024 update-trigger function saved by the forward migration.

begin;

select pg_advisory_xact_lock(hashtext('genovakorist:024:annotation-safe-save'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

lock table public.repertoire_pdf_annotations in share row exclusive mode;

drop function public.save_repertoire_pdf_annotation_snapshot(
  uuid, integer, text, text, integer, jsonb, bigint
);

do $restore$
declare
  original_definition text;
begin
  select definition
  into strict original_definition
  from genova_024.function_backup
  where signature in (
    'set_repertoire_pdf_annotations_updated_fields()',
    'public.set_repertoire_pdf_annotations_updated_fields()'
  );

  execute original_definition;
end
$restore$;

alter table public.repertoire_pdf_annotations
  drop constraint repertoire_pdf_annotations_revision_positive_chk,
  drop column revision;

drop schema genova_024 cascade;

notify pgrst, 'reload schema';

commit;
