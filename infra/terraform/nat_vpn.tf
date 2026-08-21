resource "wireguard_asymmetric_key" "server" {}
resource "wireguard_asymmetric_key" "client" {}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${local.name}-nat-eip"
  }
}

resource "aws_instance" "nat" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.nat_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.nat_vpn.id]
  iam_instance_profile        = data.aws_iam_instance_profile.lab.name
  source_dest_check           = false
  associate_public_ip_address = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  user_data = templatefile("${path.module}/user_data/nat.sh.tftpl", {
    vpn_server_ip      = local.vpn_server_ip
    server_private_key = wireguard_asymmetric_key.server.private_key
    client_public_key  = wireguard_asymmetric_key.client.public_key
    vpn_client_cidr    = var.vpn_client_cidr
  })

  user_data_replace_on_change = true

  tags = {
    Name = "${local.name}-nat-vpn"
    Role = "nat-vpn"
  }
}

resource "aws_eip_association" "nat" {
  instance_id   = aws_instance.nat.id
  allocation_id = aws_eip.nat.id
}

resource "local_file" "wireguard_client" {
  filename        = "${path.module}/wireguard-client.conf"
  file_permission = "0600"
  content         = <<-EOF
    [Interface]
    PrivateKey = ${wireguard_asymmetric_key.client.private_key}
    Address = 10.8.0.2/32

    [Peer]
    PublicKey = ${wireguard_asymmetric_key.server.public_key}
    Endpoint = ${aws_eip.nat.public_ip}:51820
    AllowedIPs = ${var.vpc_cidr}, ${local.vpn_network_cidr}
    PersistentKeepalive = 25
  EOF
}
