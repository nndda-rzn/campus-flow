$ErrorActionPreference = "Stop"

Write-Host "Generating protobuf and gRPC code..."

protoc `
  --proto_path=proto `
  --go_out=proto/gen `
  --go_opt=paths=source_relative `
  --go-grpc_out=proto/gen `
  --go-grpc_opt=paths=source_relative `
  proto/common/v1/common.proto `
  proto/auth/v1/auth.proto

Write-Host "Proto generation completed."