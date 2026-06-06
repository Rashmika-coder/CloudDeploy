output "instance_id" {
  description = "The unique AWS identifier generated for the provisioned EC2 server"
  value       = aws_instance.app_server.id
}

output "instance_public_ip" {
  description = "The public IPv4 address assigned to the EC2 server"
  value       = aws_instance.app_server.public_ip
}

output "instance_dns" {
  description = "The public DNS dynamic mapping name pointing to the EC2 instance"
  value       = aws_instance.app_server.public_dns
}

output "app_url" {
  description = "URL path for hitting the deployed Node.js docker application"
  value       = "http://${aws_instance.app_server.public_ip}:3000"
}
