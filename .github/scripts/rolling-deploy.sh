#!/usr/bin/env bash
set -euo pipefail

send_and_wait() {
  local role="$1"
  local ids
  ids="$(aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=ticketflow" "Name=tag:Role,Values=${role}" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text)"

  if [[ -z "${ids// }" || "${ids}" == "None" ]]; then
    echo "No hay instancias running con Role=${role}; el user-data hará pull cuando existan."
    return 0
  fi

  local cmd_id
  cmd_id="$(aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --comment "TicketFlow rolling deploy ${role}" \
    --instance-ids ${ids} \
    --parameters commands='["/opt/ticketflow/run.sh"]' \
    --query 'Command.CommandId' \
    --output text)"

  local id
  for id in ${ids}; do
    echo "Esperando SSM ${cmd_id} en ${id} (${role})"
    aws ssm wait command-executed --command-id "${cmd_id}" --instance-id "${id}"
  done
}

send_and_wait frontend
send_and_wait backend
