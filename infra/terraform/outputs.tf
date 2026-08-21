output "alb_url" {
  description = "URL HTTP de la demo (sin TLS)."
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "lab_instance_profile" {
  description = "Instance profile de Academy usado por NAT y ASG."
  value       = data.aws_iam_instance_profile.lab.name
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "nat_public_ip" {
  description = "Endpoint WireGuard (UDP 51820) y NAT."
  value       = aws_eip.nat.public_ip
}

output "rds_address" {
  value = aws_db_instance.main.address
}

output "wireguard_client_config_path" {
  value = local_file.wireguard_client.filename
}

output "next_steps" {
  value = <<-EOT
    1. Confirma el correo SNS de alarmas de billing (si te llega).
    2. GitHub → Settings → Secrets → Actions:
       AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
       (las 3 del panel AWS Details del lab; caducan con la sesion).
    3. Importa infra/terraform/wireguard-client.conf en WireGuard (opcional).
    4. Lanza el workflow CD (workflow_dispatch en main) para publicar imagenes ECR.
    5. Demo: http://${aws_lb.main.dns_name}
    6. Al terminar: terraform destroy
  EOT
}
