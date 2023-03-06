import boto3
import json
import logging
import os
from collections import defaultdict


logger = logging.getLogger()
logger.setLevel(logging.INFO)

lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_region = os.getenv('DYNAMODB_REGION')
db_endpoint = os.getenv('DYNAMODB_ENDPOINT')
db_table = os.getenv('DYNAMODB_TABLE_NAME')

if lambda_env == 'prod':
    logger.info('Using dynamodb in region: %s\n', db_region)
    client = boto3.client('dynamodb', region_name=db_region)
else:
    logger.info("Using dynamodb local: %s\n", db_endpoint)
    client = boto3.client('dynamodb', endpoint_url=db_endpoint)

logger.info('Using dynamodb table: %s\n', db_table)

def handler(event, context):
    book_id = event['pathParameters']['bookId']

    if book_id:
        logger.info('Query for book with partition key = '+ book_id)
        response = client.get_item(
            TableName=db_table,
            Key={
                'PK': {'S': book_id},
                'SK': {'S': book_id}
            }
        )
        return {
            'statusCode': 200,
            'body': json.dumps(getBookJson(response['Item']))
        }
    else:
        return {
            'statusCode': 404,
            'body': 'No book id found'
        }

def getBookJson(item):
    # logger.info('Parsing books response data')
    book = {}

    if (item["EntityType"]["S"] == 'book'):
        book["bookId"] = item["PK"]["S"]
        book["title"] = item["Title"]["S"]
        book["publishedDate"] = item["PublishedDate"]["S"]
        book["author"] = item["Author"]["S"]

    return book
