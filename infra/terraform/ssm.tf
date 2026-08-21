resource "random_password" "jwt_access" {
  length  = 48
  special = false
}

resource "random_password" "jwt_refresh" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/ticketflow/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://ticketflow:${random_password.db.result}@${aws_db_instance.main.address}:5432/ticketflow?sslmode=require"
}

resource "aws_ssm_parameter" "jwt_access" {
  name  = "/ticketflow/JWT_ACCESS_SECRET"
  type  = "SecureString"
  value = random_password.jwt_access.result
}

resource "aws_ssm_parameter" "jwt_refresh" {
  name  = "/ticketflow/JWT_REFRESH_SECRET"
  type  = "SecureString"
  value = random_password.jwt_refresh.result
}

resource "aws_ssm_parameter" "alb_dns" {
  name  = "/ticketflow/alb_dns"
  type  = "String"
  value = aws_lb.main.dns_name
}

resource "aws_ssm_parameter" "ecr_frontend" {
  name  = "/ticketflow/ecr_frontend"
  type  = "String"
  value = aws_ecr_repository.frontend.repository_url
}

resource "aws_ssm_parameter" "ecr_backend" {
  name  = "/ticketflow/ecr_backend"
  type  = "String"
  value = aws_ecr_repository.backend.repository_url
}

resource "aws_ssm_parameter" "frontend_tg_arn" {
  name  = "/ticketflow/frontend_tg_arn"
  type  = "String"
  value = aws_lb_target_group.frontend.arn
}

resource "aws_ssm_parameter" "backend_tg_arn" {
  name  = "/ticketflow/backend_tg_arn"
  type  = "String"
  value = aws_lb_target_group.backend.arn
}
