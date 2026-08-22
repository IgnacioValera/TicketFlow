# AWS Academy voclabs blocks iam:CreateRole / CreateInstanceProfile / CreateOpenIDConnectProvider.
# Learner Lab already provides LabRole + LabInstanceProfile.

data "aws_iam_instance_profile" "lab" {
  name = var.lab_instance_profile_name
}
