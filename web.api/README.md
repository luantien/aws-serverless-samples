# Welcome to your Web API CDK TypeScript project

## Prerequisites

-   `aws-cli` package is installed.
-   `aws-cdk` package is installed.
-   `aws-sam-cli` package is installed.
-   Configure `aws-cli profile`:

```bash
export AWS_PROFILE=<your_profile>
```

-   Setup `.env` file from `.env.sample`
-   The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

-   `npm run build` compile typescript to js
-   `npm run watch` watch for changes and compile
-   `npm run test` perform the jest unit tests
-   `cdk deploy` deploy this stack to your default AWS account/region
-   `cdk diff` compare deployed stack with current state
-   `cdk synth` emits the synthesized CloudFormation template

## Local Testing
```bash
# Generate Lambda Layer
cd lambda
pip install -r lambda/requirements.txt -t lambda/packages/python
```

```bash
# Create bridge network
docker network create aws-local
```

```bash
# Launch local dynamodb
docker run -d -p 8000:8000 --name dynamodb --network aws-local amazon/dynamodb-local
```

```bash
# create table using aws-cli
aws dynamodb create-table \
    --table-name BookLibrary \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
		AttributeName=Author,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
	--global-secondary-indexes \
        "[
            {
                \"IndexName\": \"AuthorIndex\",
                \"KeySchema\": [{\"AttributeName\":\"Author\",\"KeyType\":\"HASH\"},
                                {\"AttributeName\":\"PK\",\"KeyType\":\"RANGE\"}],
                \"Projection\":{
                    \"ProjectionType\":\"ALL\"
                },
                \"ProvisionedThroughput\": {
                    \"ReadCapacityUnits\": 5,
                    \"WriteCapacityUnits\": 5
                }
            }
        ]" \
	--endpoint-url http://localhost:8000
```

```bash
# Batch data to local  table
aws dynamodb batch-write-item --endpoint-url http://localhost:8000 --request-items file://./seeder/data-population.json
```

```bash
# Launch SAM Local API with config aws-local network
sam local start-api -t ./cdk.out/WebApiStack.template.json --env-vars lambda/test/env/local.json --docker-network aws-local
```

```bash
# Trigger invoke for get book api
sam local invoke -t ./cdk.out/WebApiStack.template.json GenerateRefIdFunction --env-vars lambda/test/env/local.json -e lambda/test/event/sample-event.json
```

## Deploy to AWS Region

-   Set `AWS_PROFILE` to your profile
-   Update `.env` file with your AWS information
```bash
# If you got the error 'Need to perform AWS calls for account <account_id>, but no credentials have been configured', please clear cdk cache
# Otherwise skip this
rm -rf ~/.cdk/
```

```bash
# Dynamo Seeder
aws dynamodb batch-write-item --profile <your_profile> --request-items file://./seeder/data-population.json
```

```bash
# Generate CloudFormation Template
cdk synth --profile <your_profile>
```

```bash
# Deploy to AWS
cdk deploy --profile <your_profile>
```

```bash
# Compare deployed stack with current state
cdk diff --profile <your_profile>
```

```bash
# Destroy stack
cdk destroy --profile <your_profile>
```
