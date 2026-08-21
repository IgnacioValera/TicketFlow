resource "aws_sns_topic" "billing" {
  name = "${local.name}-billing"
}

resource "aws_sns_topic_subscription" "billing_email" {
  topic_arn = aws_sns_topic.billing.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "billing_10" {
  alarm_name          = "${local.name}-estimated-charges-10"
  alarm_description   = "Cargos estimados de la cuenta >= 10 USD"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing.arn]
}

resource "aws_cloudwatch_metric_alarm" "billing_40" {
  alarm_name          = "${local.name}-estimated-charges-40"
  alarm_description   = "Cargos estimados de la cuenta >= 40 USD"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 40
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing.arn]
}
