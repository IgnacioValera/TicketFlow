resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "ALB public HTTP"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP demo (sin dominio/ACM)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-alb-sg" }
}

resource "aws_security_group" "frontend" {
  name        = "${local.name}-frontend"
  description = "ASG frontend solo desde ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "nginx desde ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-frontend-sg" }
}

resource "aws_security_group" "backend" {
  name        = "${local.name}-backend"
  description = "ASG backend desde ALB y clientes VPN"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API desde ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "API debug desde WireGuard"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [local.vpn_network_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-backend-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "PostgreSQL solo backend y VPN"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres desde API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  ingress {
    description = "psql de emergencia desde WireGuard"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [local.vpn_network_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-rds-sg" }
}

resource "aws_security_group" "nat_vpn" {
  name        = "${local.name}-nat-vpn"
  description = "NAT instance + WireGuard"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "WireGuard"
    from_port   = 51820
    to_port     = 51820
    protocol    = "udp"
    cidr_blocks = [var.allowed_vpn_cidr]
  }

  ingress {
    description = "Forward/return hacia privadas (establecido)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr, local.vpn_network_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-nat-vpn-sg" }
}
