locals {
  name = var.project

  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  public_subnet_cidrs  = [cidrsubnet(var.vpc_cidr, 8, 0), cidrsubnet(var.vpc_cidr, 8, 1)]
  private_subnet_cidrs = [cidrsubnet(var.vpc_cidr, 8, 10), cidrsubnet(var.vpc_cidr, 8, 11)]

  vpn_network_cidr = "10.8.0.0/24"
  vpn_server_ip    = "10.8.0.1/24"

  common_tags = {
    Project     = var.project
    Environment = "lab"
    ManagedBy   = "terraform"
  }

  ecr_lifecycle = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
