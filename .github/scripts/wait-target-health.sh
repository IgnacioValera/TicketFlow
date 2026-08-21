#!/usr/bin/env bash
set -euo pipefail

wait_tg() {
  local arn="$1"
  local name="$2"
  local i
  for i in $(seq 1 80); do
    local states
    states="$(aws elbv2 describe-target-health --target-group-arn "${arn}" \
      --query 'TargetHealthDescriptions[].TargetHealth.State' --output text 2>/dev/null || true)"
    echo "[${name}] intento ${i}/80 estados: ${states:-ninguno}"
    if [[ -n "${states}" && "${states}" != *"None"* ]] && [[ "${states}" != *"unhealthy"* ]] && [[ "${states}" != *"unused"* ]] && [[ "${states}" != *"draining"* ]] && [[ "${states}" != *"initial"* ]]; then
      if [[ "${states}" == *"healthy"* ]]; then
        echo "[${name}] healthy"
        return 0
      fi
    fi
    sleep 15
  done
  echo "[${name}] timeout esperando targets healthy" >&2
  aws elbv2 describe-target-health --target-group-arn "${arn}" || true
  return 1
}

wait_tg "${FRONTEND_TG_ARN}" frontend
wait_tg "${BACKEND_TG_ARN}" backend
