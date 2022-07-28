#!/bin/bash
# export env variables
export $(grep -v '^#' .env | xargs)

# Clean up all source files
aws s3 rm s3://$S3_BUCKET_NAME --recursive --profile $AWS_PROFILE

# Sync new source file version to S3
aws s3 sync ../dist s3://$S3_BUCKET_NAME --profile $AWS_PROFILE
