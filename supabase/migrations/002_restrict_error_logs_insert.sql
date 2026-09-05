-- Item #6 do PLANO_CORRECOES: restringir error_logs_insert_public.
-- A policy anterior permitia que qualquer anon escrevesse log arbitrário
-- com o campo context jsonb. Agora somente authenticated pode inserir,
-- e um trigger valida que message não está vazio e context é um objeto.

-- Remove a policy anterior aberta.
drop policy if exists error_logs_insert_public on public.error_logs;

-- Policy restrita: somente authenticated, com campos obrigatórios.
create policy error_logs_insert_authenticated on public.error_logs
  for insert to authenticated
  with check (
    message is not null
    and length(trim(message)) > 0
    and jsonb_typeof(context) = 'object'
  );

-- Validação extra via trigger (RLS não valida colunas individualmente).
create or replace function private.validate_error_log_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.message is null or length(trim(new.message)) = 0 then
    raise exception 'error_logs.message não pode ser vazio.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(new.context) != 'object' then
    raise exception 'error_logs.context deve ser um objeto JSON.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger error_logs_validate_insert
  before insert on public.error_logs
  for each row execute function private.validate_error_log_insert();

revoke all on function private.validate_error_log_insert() from public, anon, authenticated;
