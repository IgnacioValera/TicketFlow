resource "random_password" "db" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${local.name}-db-subnets"
  }
}

resource "aws_db_instance" "main" {
  identifier                  = "${local.name}-pg"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = "ticketflow"
  username                    = "ticketflow"
  password                    = random_password.db.result
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  multi_az                    = false
  publicly_accessible         = false
  backup_retention_period     = 1
  deletion_protection         = false
  skip_final_snapshot         = true
  apply_immediately           = true
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  tags = {
    Name = "${local.name}-postgres"
    Role = "database"
  }
}
