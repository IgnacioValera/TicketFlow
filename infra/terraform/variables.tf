variable "aws_region" {
  description = "Región AWS. us-east-1 para crédito académico y métrica AWS/Billing."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Prefijo de nombres y tags."
  type        = string
  default     = "ticketflow"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "instance_type" {
  description = "Tipo de instancia para ASG frontend y backend."
  type        = string
  default     = "t3.micro"
}

variable "nat_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "asg_min_size" {
  type    = number
  default = 1
}

variable "asg_max_size" {
  type    = number
  default = 2
}

variable "asg_desired_capacity" {
  type    = number
  default = 1
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "alert_email" {
  description = "Correo para confirmar la suscripción SNS de alarmas de costo."
  type        = string
}

variable "lab_instance_profile_name" {
  description = "Instance profile de AWS Academy (voclabs no permite CreateRole)."
  type        = string
  default     = "LabInstanceProfile"
}

variable "github_repository" {
  description = "owner/repo (informativo). CD no usa OIDC; voclabs no permite CreateOpenIDConnectProvider."
  type        = string
  default     = "IgnacioValera/TicketFlow"
}

variable "vpn_client_cidr" {
  description = "CIDR de clientes WireGuard (peer)."
  type        = string
  default     = "10.8.0.2/32"
}

variable "allowed_vpn_cidr" {
  description = "Origen permitido hacia UDP 51820. Restríngelo a tu IP pública si es posible."
  type        = string
  default     = "0.0.0.0/0"
}
